import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.report_template import ReportTemplate
from app.schemas.report import (
    ReportTemplateCreate,
    ReportTemplateResponse,
    ReportGenerateRequest,
)
from app.services.reports import generate_diligence_report, DEFAULT_SECTIONS

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/templates", response_model=list[ReportTemplateResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):
    """List all report templates."""
    result = await db.execute(select(ReportTemplate))
    templates = result.scalars().all()

    # Add default template if none exist
    if not templates:
        default = ReportTemplate(
            name="Standard Diligence Report",
            sections=DEFAULT_SECTIONS,
            is_default=True,
        )
        db.add(default)
        await db.commit()
        await db.refresh(default)
        templates = [default]

    return [
        ReportTemplateResponse(
            id=t.id,
            name=t.name,
            sections=t.sections,
            is_default=t.is_default,
        )
        for t in templates
    ]


@router.post("/templates", response_model=ReportTemplateResponse)
async def create_template(
    data: ReportTemplateCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new report template."""
    template = ReportTemplate(
        name=data.name,
        sections=data.sections,
        is_default=data.is_default,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return ReportTemplateResponse(
        id=template.id,
        name=template.name,
        sections=template.sections,
        is_default=template.is_default,
    )


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a report template."""
    result = await db.execute(
        select(ReportTemplate).where(ReportTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default template")

    await db.delete(template)
    await db.commit()


@router.post("/generate")
async def generate_report(
    request: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a diligence report as PDF."""
    # Get sections from template or request
    sections = request.sections
    if not sections and request.template_id:
        result = await db.execute(
            select(ReportTemplate).where(ReportTemplate.id == request.template_id)
        )
        template = result.scalar_one_or_none()
        if template:
            sections = template.sections

    try:
        pdf_bytes = await generate_diligence_report(
            db=db,
            project_id=request.project_id,
            sections=sections,
            title=request.title,
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=diligence-report-{request.project_id}.pdf"
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
