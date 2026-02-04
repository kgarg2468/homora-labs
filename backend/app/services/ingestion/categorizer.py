import re
from app.models.document import DocumentCategory


# Keywords and patterns for document categorization
CATEGORY_PATTERNS = {
    DocumentCategory.lease: [
        r"\blease\b",
        r"\btenant\b",
        r"\blandlord\b",
        r"\brent\b",
        r"\boccupancy\b",
        r"\bpremises\b",
        r"\bsublease\b",
        r"\blessee\b",
        r"\blessor\b",
        r"\bterm\s+of\s+lease\b",
    ],
    DocumentCategory.appraisal: [
        r"\bappraisal\b",
        r"\bmarket\s+value\b",
        r"\bappraised\s+value\b",
        r"\bcomparable\s+sales\b",
        r"\bincome\s+approach\b",
        r"\bcost\s+approach\b",
        r"\bMAI\b",
        r"\bvaluation\b",
    ],
    DocumentCategory.title: [
        r"\btitle\s+insurance\b",
        r"\btitle\s+report\b",
        r"\brecorded\b",
        r"\bdeed\b",
        r"\beasement\b",
        r"\bencumbrance\b",
        r"\blien\b",
        r"\bchain\s+of\s+title\b",
        r"\bpreliminary\s+title\b",
    ],
    DocumentCategory.zoning: [
        r"\bzoning\b",
        r"\bpermitted\s+use\b",
        r"\bsetback\b",
        r"\bvariance\b",
        r"\bconditional\s+use\b",
        r"\bFAR\b",
        r"\bfloor\s+area\s+ratio\b",
        r"\bheight\s+limit\b",
        r"\bparking\s+requirement\b",
    ],
    DocumentCategory.financial: [
        r"\bfinancial\s+statement\b",
        r"\bproforma\b",
        r"\bcash\s+flow\b",
        r"\bNOI\b",
        r"\bnet\s+operating\s+income\b",
        r"\bcap\s+rate\b",
        r"\boperating\s+expenses\b",
        r"\brent\s+roll\b",
        r"\bP&L\b",
    ],
    DocumentCategory.survey: [
        r"\bsurvey\b",
        r"\bboundary\b",
        r"\bALTA\b",
        r"\bmetes\s+and\s+bounds\b",
        r"\btopographic\b",
        r"\bplat\b",
        r"\bsetback\s+line\b",
        r"\bright\s+of\s+way\b",
    ],
    DocumentCategory.environmental: [
        r"\bphase\s+(I|1|one)\b",
        r"\bphase\s+(II|2|two)\b",
        r"\benvironmental\s+assessment\b",
        r"\bcontamination\b",
        r"\bhazardous\b",
        r"\basbestos\b",
        r"\blead\s+paint\b",
        r"\bESA\b",
        r"\brendered\s+services\b",
    ],
}


def categorize_document(text: str, filename: str = "") -> DocumentCategory:
    """
    Automatically categorize a document based on its content and filename.
    Returns DocumentCategory.other if no clear match is found.
    """
    # Combine filename and first part of text for analysis
    analysis_text = f"{filename.lower()} {text[:5000].lower()}"

    # Count matches for each category
    category_scores = {}

    for category, patterns in CATEGORY_PATTERNS.items():
        score = 0
        for pattern in patterns:
            matches = re.findall(pattern, analysis_text, re.IGNORECASE)
            score += len(matches)
        category_scores[category] = score

    # Find category with highest score
    if category_scores:
        best_category = max(category_scores, key=category_scores.get)
        if category_scores[best_category] >= 2:  # Require at least 2 matches
            return best_category

    return DocumentCategory.other


def suggest_category_from_filename(filename: str) -> DocumentCategory | None:
    """Suggest category based on filename alone."""
    filename_lower = filename.lower()

    filename_hints = {
        DocumentCategory.lease: ["lease", "rental", "tenant"],
        DocumentCategory.appraisal: ["appraisal", "valuation"],
        DocumentCategory.title: ["title", "deed", "preliminary"],
        DocumentCategory.zoning: ["zoning", "permit", "variance"],
        DocumentCategory.financial: ["financial", "proforma", "rent_roll", "rentroll"],
        DocumentCategory.survey: ["survey", "alta", "plat"],
        DocumentCategory.environmental: ["environmental", "phase1", "phase_1", "esa"],
    }

    for category, hints in filename_hints.items():
        if any(hint in filename_lower for hint in hints):
            return category

    return None
