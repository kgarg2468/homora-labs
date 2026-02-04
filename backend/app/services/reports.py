import uuid
from io import BytesIO
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import markdown
from weasyprint import HTML, CSS

from app.models.project import Project
from app.models.document import Document
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.report_template import ReportTemplate


DEFAULT_SECTIONS = [
    "Executive Summary",
    "Property Overview",
    "Key Findings",
    "Document Analysis",
    "Risk Assessment",
    "Recommendations",
    "Appendix",
]


async def generate_diligence_report(
    db: AsyncSession,
    project_id: uuid.UUID,
    sections: list[str] | None = None,
    title: str | None = None,
) -> bytes:
    """Generate a PDF diligence report for a project."""
    # Get project
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    # Get documents
    result = await db.execute(
        select(Document).where(Document.project_id == project_id)
    )
    documents = result.scalars().all()

    # Get conversations
    result = await db.execute(
        select(Conversation)
        .where(Conversation.project_id == project_id)
        .where(Conversation.archived == False)
    )
    conversations = result.scalars().all()

    # Get messages from conversations
    conversation_ids = [c.id for c in conversations]
    if conversation_ids:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id.in_(conversation_ids))
            .order_by(Message.created_at)
        )
        messages = result.scalars().all()
    else:
        messages = []

    # Build report content
    sections = sections or DEFAULT_SECTIONS
    title = title or f"Due Diligence Report: {project.name}"

    report_md = build_report_markdown(
        project=project,
        documents=documents,
        messages=messages,
        sections=sections,
        title=title,
    )

    # Convert markdown to HTML
    html_content = markdown.markdown(report_md, extensions=["tables", "fenced_code"])

    # Wrap in HTML document
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{title}</title>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # Convert to PDF
    css = CSS(string=REPORT_CSS)
    pdf_bytes = HTML(string=full_html).write_pdf(stylesheets=[css])

    return pdf_bytes


def build_report_markdown(
    project: Project,
    documents: list[Document],
    messages: list[Message],
    sections: list[str],
    title: str,
) -> str:
    """Build the markdown content for the report."""
    lines = [f"# {title}", ""]
    lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Project:** {project.name}")
    if project.description:
        lines.append(f"**Description:** {project.description}")
    lines.append("")

    # Table of contents
    lines.append("## Table of Contents")
    for i, section in enumerate(sections, 1):
        lines.append(f"{i}. [{section}](#{section.lower().replace(' ', '-')})")
    lines.append("")

    for section in sections:
        lines.append(f"## {section}")
        lines.append("")

        if section == "Executive Summary":
            lines.append("*This section provides a high-level overview of the due diligence findings.*")
            lines.append("")
            # Extract key findings from assistant messages
            key_findings = extract_key_findings(messages)
            if key_findings:
                for finding in key_findings[:5]:
                    lines.append(f"- {finding}")
            else:
                lines.append("No key findings recorded yet.")
            lines.append("")

        elif section == "Property Overview":
            lines.append("*Property details and basic information.*")
            lines.append("")
            lines.append("| Attribute | Value |")
            lines.append("|-----------|-------|")
            lines.append(f"| Project Name | {project.name} |")
            lines.append(f"| Documents Analyzed | {len(documents)} |")
            lines.append(f"| Analysis Sessions | {len(set(m.conversation_id for m in messages))} |")
            lines.append("")

        elif section == "Document Analysis":
            lines.append("*Summary of documents reviewed.*")
            lines.append("")
            if documents:
                lines.append("| Document | Type | Category | Status |")
                lines.append("|----------|------|----------|--------|")
                for doc in documents:
                    lines.append(
                        f"| {doc.filename} | {doc.file_type.value} | {doc.category.value} | {doc.ingestion_status.value} |"
                    )
            else:
                lines.append("No documents have been uploaded yet.")
            lines.append("")

        elif section == "Key Findings":
            lines.append("*Important findings from the analysis.*")
            lines.append("")
            findings = extract_key_findings(messages)
            if findings:
                for finding in findings:
                    lines.append(f"- {finding}")
            else:
                lines.append("No specific findings recorded.")
            lines.append("")

        elif section == "Risk Assessment":
            lines.append("*Identified risks and concerns.*")
            lines.append("")
            risks = extract_risks(messages)
            if risks:
                for risk in risks:
                    lines.append(f"- ⚠️ {risk}")
            else:
                lines.append("No specific risks identified.")
            lines.append("")

        elif section == "Recommendations":
            lines.append("*Recommended next steps.*")
            lines.append("")
            recommendations = extract_recommendations(messages)
            if recommendations:
                for rec in recommendations:
                    lines.append(f"- {rec}")
            else:
                lines.append("No specific recommendations at this time.")
            lines.append("")

        elif section == "Appendix":
            lines.append("*Supporting information and raw Q&A sessions.*")
            lines.append("")
            lines.append("### Q&A Session Summary")
            lines.append("")
            if messages:
                for msg in messages[:20]:  # Limit to 20 messages
                    role = "**Q:**" if msg.role.value == "user" else "**A:**"
                    content = msg.content[:500] + "..." if len(msg.content) > 500 else msg.content
                    lines.append(f"{role} {content}")
                    lines.append("")
            else:
                lines.append("No Q&A sessions recorded.")
            lines.append("")

        else:
            lines.append(f"*Content for {section}*")
            lines.append("")

    # Footer
    lines.append("---")
    lines.append("*Report generated by Homora - Real Estate Intelligence Assistant*")

    return "\n".join(lines)


def extract_key_findings(messages: list[Message]) -> list[str]:
    """Extract key findings from assistant messages."""
    findings = []
    for msg in messages:
        if msg.role.value == "assistant":
            # Look for findings in structured responses
            content = msg.content
            if "**Evidence:**" in content or "Evidence:" in content:
                # Try to extract evidence section
                import re

                match = re.search(r"(?:Evidence:|Evidence)\s*\n?((?:[-•]\s*.+\n?)+)", content)
                if match:
                    items = re.findall(r"[-•]\s*(.+)", match.group(1))
                    findings.extend(items[:3])
    return findings[:10]


def extract_risks(messages: list[Message]) -> list[str]:
    """Extract risk flags from assistant messages."""
    risks = []
    for msg in messages:
        if msg.role.value == "assistant":
            content = msg.content
            if "Risk" in content or "risk" in content:
                import re

                match = re.search(r"(?:Risk Flags?:|Risks?:)\s*\n?((?:[-•]\s*.+\n?)+)", content)
                if match:
                    items = re.findall(r"[-•]\s*(.+)", match.group(1))
                    risks.extend(items)
    return risks[:10]


def extract_recommendations(messages: list[Message]) -> list[str]:
    """Extract recommendations/next steps from assistant messages."""
    recs = []
    for msg in messages:
        if msg.role.value == "assistant":
            content = msg.content
            if "Next Steps" in content or "Recommendations" in content:
                import re

                match = re.search(
                    r"(?:Next Steps?:|Recommendations?:)\s*\n?((?:[-•]\s*.+\n?)+)", content
                )
                if match:
                    items = re.findall(r"[-•]\s*(.+)", match.group(1))
                    recs.extend(items)
    return recs[:10]


REPORT_CSS = """
@page {
    size: letter;
    margin: 1in;
}

body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #333;
}

h1 {
    font-size: 24pt;
    color: #1a365d;
    border-bottom: 2px solid #1a365d;
    padding-bottom: 10px;
    margin-top: 0;
}

h2 {
    font-size: 16pt;
    color: #2c5282;
    margin-top: 30px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 5px;
}

h3 {
    font-size: 13pt;
    color: #4a5568;
    margin-top: 20px;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
}

th, td {
    border: 1px solid #e2e8f0;
    padding: 8px 12px;
    text-align: left;
}

th {
    background-color: #f7fafc;
    font-weight: bold;
}

tr:nth-child(even) {
    background-color: #f7fafc;
}

ul, ol {
    margin: 10px 0;
    padding-left: 25px;
}

li {
    margin: 5px 0;
}

hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 30px 0;
}

em {
    color: #718096;
}

strong {
    color: #1a202c;
}
"""
