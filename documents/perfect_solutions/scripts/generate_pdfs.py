"""
Generate BRD and FRD PDFs for Perfect Solutions using ReportLab Platypus.
Produces a polished, branded PDF with logo header, TOC, tables, and figures.
"""
import os
from datetime import date
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, PageBreak, Image,
                                KeepTogether, NextPageTemplate)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas

OUT = "/app/documents/perfect_solutions"
ASSETS = f"{OUT}/assets"
LOGO = f"{ASSETS}/logo.png"

PRIMARY = HexColor("#1E3A8A")
SECONDARY = HexColor("#3B82F6")
ACCENT = HexColor("#DBEAFE")
DARK = HexColor("#0F172A")
GRAY = HexColor("#64748B")
LIGHT = HexColor("#F8FAFC")
LIGHT_GRAY = HexColor("#E2E8F0")
GREEN_FILL = HexColor("#DCFCE7")
RED_FILL = HexColor("#FEE2E2")

styles = getSampleStyleSheet()


def make_styles():
    base = styles['Normal']
    base.fontName = 'Helvetica'
    base.fontSize = 10.5
    base.leading = 14
    base.textColor = DARK

    s = {}
    s['title'] = ParagraphStyle('title', parent=base, fontSize=32, leading=38,
                                textColor=PRIMARY, alignment=TA_CENTER,
                                fontName='Helvetica-Bold', spaceAfter=10)
    s['subtitle'] = ParagraphStyle('subtitle', parent=base, fontSize=16, leading=20,
                                   textColor=GRAY, alignment=TA_CENTER, spaceAfter=20)
    s['brand'] = ParagraphStyle('brand', parent=base, fontSize=24, leading=28,
                                textColor=PRIMARY, alignment=TA_CENTER,
                                fontName='Helvetica-Bold')
    s['tagline'] = ParagraphStyle('tagline', parent=base, fontSize=12, leading=16,
                                  textColor=SECONDARY, alignment=TA_CENTER,
                                  fontName='Helvetica-Oblique', spaceAfter=30)
    s['h1'] = ParagraphStyle('h1', parent=base, fontSize=18, leading=22,
                             textColor=PRIMARY, fontName='Helvetica-Bold',
                             spaceBefore=18, spaceAfter=8, keepWithNext=True)
    s['h2'] = ParagraphStyle('h2', parent=base, fontSize=14, leading=18,
                             textColor=PRIMARY, fontName='Helvetica-Bold',
                             spaceBefore=12, spaceAfter=4, keepWithNext=True)
    s['h3'] = ParagraphStyle('h3', parent=base, fontSize=12, leading=16,
                             textColor=SECONDARY, fontName='Helvetica-Bold',
                             spaceBefore=8, spaceAfter=2, keepWithNext=True)
    s['body'] = ParagraphStyle('body', parent=base, fontSize=10.5, leading=15,
                               textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=6)
    s['bullet'] = ParagraphStyle('bullet', parent=base, fontSize=10.5, leading=14,
                                 leftIndent=18, bulletIndent=6, spaceAfter=2)
    s['callout'] = ParagraphStyle('callout', parent=base, fontSize=11, leading=15,
                                  textColor=PRIMARY, fontName='Helvetica-Bold',
                                  alignment=TA_LEFT, spaceAfter=6)
    s['caption'] = ParagraphStyle('caption', parent=base, fontSize=9, leading=12,
                                  textColor=GRAY, fontName='Helvetica-Oblique',
                                  alignment=TA_CENTER, spaceAfter=10)
    s['cover_meta_label'] = ParagraphStyle('covlbl', parent=base, fontSize=10,
                                           textColor=white,
                                           fontName='Helvetica-Bold', alignment=TA_LEFT)
    s['cover_meta_value'] = ParagraphStyle('covval', parent=base, fontSize=10,
                                           textColor=DARK, fontName='Helvetica',
                                           alignment=TA_LEFT)
    s['toc_entry'] = ParagraphStyle('toce', parent=base, fontSize=11, leading=16,
                                    textColor=DARK, spaceAfter=2)
    return s


S = make_styles()


# ---------- page templates ----------
def header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = LETTER
    # top stripe
    canvas_obj.setFillColor(PRIMARY)
    canvas_obj.rect(0, h - 0.5 * inch, w, 0.5 * inch, fill=1, stroke=0)
    # logo
    try:
        canvas_obj.drawImage(LOGO, 0.5 * inch, h - 0.45 * inch,
                             width=0.85 * inch, height=0.32 * inch,
                             preserveAspectRatio=True, mask='auto')
    except Exception:
        pass
    canvas_obj.setFillColor(white)
    canvas_obj.setFont('Helvetica-Bold', 10)
    canvas_obj.drawRightString(w - 0.5 * inch, h - 0.3 * inch,
                               doc.title or "Perfect Solutions HRMS")
    # footer
    canvas_obj.setFillColor(LIGHT_GRAY)
    canvas_obj.rect(0, 0, w, 0.45 * inch, fill=1, stroke=0)
    canvas_obj.setFillColor(GRAY)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawString(0.5 * inch, 0.2 * inch,
                          "Perfect Solutions HRMS  |  © 2026  |  Confidential")
    canvas_obj.drawRightString(w - 0.5 * inch, 0.2 * inch,
                               f"Page {doc.page}")
    canvas_obj.restoreState()


def cover_page_canvas(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = LETTER
    # full bleed background top band
    canvas_obj.setFillColor(PRIMARY)
    canvas_obj.rect(0, h - 1.6 * inch, w, 1.6 * inch, fill=1, stroke=0)
    # bottom band
    canvas_obj.setFillColor(SECONDARY)
    canvas_obj.rect(0, 0, w, 0.6 * inch, fill=1, stroke=0)
    canvas_obj.restoreState()


# ---------- helpers ----------
def hr(color=PRIMARY, thickness=1.2, space=6):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceBefore=space, spaceAfter=space)


def section_callout(text):
    tbl = Table([[Paragraph(text, S['callout'])]], colWidths=[6.5 * inch])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBEFORE', (0, 0), (0, -1), 3, PRIMARY),
    ]))
    return tbl


def bullets(items):
    return [Paragraph("• " + i, S['bullet']) for i in items]


def numbered(items):
    return [Paragraph(f"{i+1}. {t}", S['bullet']) for i, t in enumerate(items)]


def styled_table(headers, rows, col_widths, header_bg=PRIMARY, header_fg=white,
                 zebra=True, font_size=9, header_size=9.5, align='LEFT'):
    data = [[Paragraph(f"<b>{h}</b>", ParagraphStyle('h', parent=S['body'],
            textColor=header_fg, fontSize=header_size, leading=header_size + 2,
            fontName='Helvetica-Bold')) for h in headers]]
    body_style = ParagraphStyle('tb', parent=S['body'], fontSize=font_size,
                                leading=font_size + 3, alignment=TA_LEFT)
    for row in rows:
        cells = []
        for v in row:
            txt = str(v) if v is not None else ""
            cells.append(Paragraph(txt, body_style))
        data.append(cells)

    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), header_bg),
        ('TEXTCOLOR', (0, 0), (-1, 0), header_fg),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.4, LIGHT_GRAY),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    if zebra:
        for ri in range(1, len(data)):
            if ri % 2 == 0:
                style.append(('BACKGROUND', (0, ri), (-1, ri), LIGHT))
    tbl.setStyle(TableStyle(style))
    return tbl


def figure(path, width=6.4 * inch, caption=None):
    elems = []
    img = Image(path, width=width, height=width * 0.55)
    img.hAlign = 'CENTER'
    elems.append(img)
    if caption:
        elems.append(Paragraph(caption, S['caption']))
    elems.append(Spacer(1, 4))
    return KeepTogether(elems)


# ---------- portal screenshots ----------
SCREENSHOTS_DIR = f"{ASSETS}/screenshots"

PORTAL_SHOTS = [
    ("01_tenant_landing.png", "Screen A1 — Tenant Landing",
     "Branded landing page for hr.perfectsolutions.com — logo, brand colors, and tagline applied automatically by the multi-tenant theming engine."),
    ("02_login.png", "Screen A2 — Login",
     "Login experience inherits the tenant brand. Tenant slug captured implicitly; only Perfect Solutions credentials are accepted."),
    ("03_signup.png", "Screen A3 — Admin Signup (Invite-Code Gated)",
     "New tenant admins must present a tenant-specific invite code to register, enforcing the secure onboarding flow."),
    ("04_admin_dashboard.png", "Screen A4 — Admin Dashboard",
     "Unified admin landing — KPIs, recent activity, and quick access to operations modules."),
    ("05_admin_employees.png", "Screen A5 — Employee Directory (Admin)",
     "Searchable, filterable directory with role and department context. Drives every people-related workflow."),
    ("06_admin_timesheets.png", "Screen A6 — Timesheet Approvals (Admin / Manager)",
     "Pending timesheet review queue. Approve, reject, or request changes; bulk actions supported."),
    ("07_admin_leave.png", "Screen A7 — Leave Approval Queue (Admin / Manager)",
     "Pending leave requests with balance, overlap, and policy context for one-click decisions."),
    ("08_admin_tickets.png", "Screen A8 — Tickets / Helpdesk (Admin View)",
     "Internal helpdesk with categorization, SLA visibility, and threaded responses."),
    ("09_admin_calendar.png", "Screen A9 — Unified Calendar",
     "Approved leaves, company events, and scheduled meetings on a single calendar — Day, Week, Month, Agenda views."),
    ("10_admin_projects.png", "Screen A10 — Projects & Allocation",
     "Project list with capacity and allocation overview — drives the utilization reports."),
    ("11_employee_dashboard.png", "Screen A11 — Employee Dashboard",
     "Self-service home: clock in/out, pending requests, announcements, quick actions."),
    ("12_employee_leave.png", "Screen A12 — Employee Leave",
     "Real-time leave balance with request submission, status tracking, and PDF export."),
    ("13_employee_documents.png", "Screen A13 — Document Vault",
     "PIN-secured personal document vault — payslips, offer letters, signed policies."),
    ("14_employee_timesheet.png", "Screen A14 — Employee Timesheet",
     "Daily/weekly entry with project tagging, drafts, and submit-for-approval workflow."),
    ("15_employee_tickets.png", "Screen A15 — Employee Tickets",
     "Raise and track internal support tickets; threaded comments and status updates."),
]


def screenshot(path, label, caption, width=6.4 * inch):
    """Embed a portal screenshot preserving its native aspect ratio."""
    elems = []
    try:
        from PIL import Image as PILImage
        pw, ph = PILImage.open(path).size
        ratio = ph / pw
    except Exception:
        ratio = 0.47
    img = Image(path, width=width, height=width * ratio)
    img.hAlign = 'CENTER'
    # label bar
    label_tbl = Table([[Paragraph(f"<b><font color='white'>{label}</font></b>", S['callout'])]],
                      colWidths=[width])
    label_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elems.append(label_tbl)
    elems.append(Spacer(1, 2))
    elems.append(img)
    elems.append(Paragraph(caption, S['caption']))
    elems.append(Spacer(1, 8))
    return KeepTogether(elems)


def portal_appendix(appendix_letter="A"):
    """Build the Portal Walkthrough appendix flowables."""
    story = []
    story.append(PageBreak())
    story.append(Paragraph(
        f"Appendix {appendix_letter} — Portal Walkthrough (Screenshots)", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "This appendix presents annotated screen captures from the live Perfect Solutions tenant of the "
        "Perfect Solutions HRMS portal. Screens are grouped by role to illustrate how the platform satisfies the "
        "requirements stated earlier in this document. All screens are rendered on the <b>perfectsolutions</b> "
        "tenant with full brand styling (logo, primary color <b>#1E3A8A</b>) applied automatically.",
        S['body']))
    story.append(Spacer(1, 6))

    story.append(Paragraph(f"{appendix_letter}.1 Public / Tenant-Branded Pages", S['h2']))
    for fn, label, cap in PORTAL_SHOTS[0:3]:
        story.append(screenshot(f"{SCREENSHOTS_DIR}/{fn}", label, cap))

    story.append(PageBreak())
    story.append(Paragraph(f"{appendix_letter}.2 Admin / Manager Views", S['h2']))
    for fn, label, cap in PORTAL_SHOTS[3:10]:
        story.append(screenshot(f"{SCREENSHOTS_DIR}/{fn}", label, cap))

    story.append(PageBreak())
    story.append(Paragraph(f"{appendix_letter}.3 Employee Self-Service Views", S['h2']))
    for fn, label, cap in PORTAL_SHOTS[10:]:
        story.append(screenshot(f"{SCREENSHOTS_DIR}/{fn}", label, cap))
    return story


def cover(doc_type, doc_code, version):
    elems = []
    elems.append(Spacer(1, 0.6 * inch))
    img = Image(LOGO, width=2.4 * inch, height=1.0 * inch)
    img.hAlign = 'CENTER'
    elems.append(img)
    elems.append(Spacer(1, 0.3 * inch))
    elems.append(Paragraph("PERFECT SOLUTIONS", S['brand']))
    elems.append(Paragraph("Unleashing IT Talent", S['tagline']))
    elems.append(Spacer(1, 0.7 * inch))
    elems.append(Paragraph(doc_type, S['title']))
    elems.append(Paragraph("Internal HRMS Implementation", S['subtitle']))
    elems.append(Spacer(1, 0.4 * inch))

    info = [
        ["Document Code", doc_code],
        ["Version", version],
        ["Date", date.today().strftime("%B %d, %Y")],
        ["Classification", "Confidential — Internal Use"],
        ["Prepared By", "IT & Product Implementation Team"],
        ["Prepared For", "Perfect Solutions"],
    ]
    rows = []
    for k, v in info:
        rows.append([Paragraph(f"<b>{k}</b>", S['cover_meta_label']),
                     Paragraph(v, S['cover_meta_value'])])
    tbl = Table(rows, colWidths=[2.0 * inch, 3.5 * inch], hAlign='CENTER')
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), PRIMARY),
        ('BACKGROUND', (1, 0), (1, -1), LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.3, white),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elems.append(tbl)
    elems.append(PageBreak())
    return elems


def build_doc(filepath, title):
    doc = BaseDocTemplate(filepath, pagesize=LETTER,
                          leftMargin=0.7 * inch, rightMargin=0.7 * inch,
                          topMargin=0.85 * inch, bottomMargin=0.7 * inch,
                          title=title, author="Internal Product Team")
    cover_frame = Frame(0.5 * inch, 0.5 * inch, LETTER[0] - 1.0 * inch,
                        LETTER[1] - 1.0 * inch, id='cover')
    body_frame = Frame(0.7 * inch, 0.55 * inch, LETTER[0] - 1.4 * inch,
                       LETTER[1] - 1.45 * inch, id='body')

    doc.addPageTemplates([
        PageTemplate(id='Cover', frames=cover_frame, onPage=cover_page_canvas),
        PageTemplate(id='Body', frames=body_frame, onPage=header_footer),
    ])
    return doc


# ===================================================================
# BRD CONTENT (mirrors DOCX)
# ===================================================================
def brd_story():
    story = []
    story += cover("Business Requirements Document", "PS-BRD-2026-001", "1.0")
    story.append(NextPageTemplate('Body'))

    # 1. Document Control
    story.append(Paragraph("1. Document Control", S['h1']))
    story.append(hr())
    story.append(styled_table(
        ["Version", "Date", "Author", "Reviewer", "Change"],
        [
            ["0.1", "2026-01-15", "Project Manager", "Perfect Solutions HR", "Initial draft"],
            ["0.5", "2026-01-22", "Implementation Lead", "PS IT Director", "Internal review"],
            ["1.0", date.today().strftime("%Y-%m-%d"), "Project Manager", "PS Steering Committee", "Approved baseline"],
        ],
        [0.7 * inch, 1.1 * inch, 1.6 * inch, 1.6 * inch, 1.7 * inch]
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("1.1 Distribution List", S['h2']))
    story.append(styled_table(
        ["Name / Role", "Organization", "Purpose"],
        [
            ["Director, IT Services", "Perfect Solutions", "Approver"],
            ["Head of Human Resources", "Perfect Solutions", "Approver"],
            ["Chief Financial Officer", "Perfect Solutions", "Reviewer"],
            ["Engineering Manager", "Perfect Solutions", "Reviewer"],
            ["Implementation Lead", "Perfect Solutions IT", "Owner"],
            ["Product Manager", "Perfect Solutions IT", "Author"],
        ],
        [2.4 * inch, 2.2 * inch, 2.1 * inch]
    ))
    story.append(PageBreak())

    # 2. Executive Summary
    story.append(Paragraph("2. Executive Summary", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Perfect Solutions is a mid-sized IT Services and Software Development firm headquartered in the United States, "
        "operating with a workforce of approximately 51–250 employees distributed across engineering, sales, marketing, "
        "finance, human resources, and general operations. As the company scales its delivery footprint and onboards "
        "increasingly distributed talent, it has identified the need to consolidate its people-operations stack onto a "
        "single, multi-tenant SaaS platform — Perfect Solutions HRMS.",
        S['body']))
    story.append(Paragraph(
        "This Business Requirements Document (BRD) captures the consolidated set of business goals, stakeholder "
        "expectations, success metrics, scope boundaries, and business-level requirements that must be satisfied by "
        "the Perfect Solutions HRMS deployment. It serves as the contractual foundation upon which "
        "the Functional Requirements Document (FRD), system design, and acceptance test cases will be built.",
        S['body']))
    story.append(Spacer(1, 6))
    story.append(section_callout(
        "Key Outcome Targets — reduce HR administrative effort by 60%, eliminate spreadsheet-driven tracking, "
        "achieve 99.9% platform availability, and deliver a measurable improvement in employee experience within "
        "two quarters of go-live."))
    story.append(Spacer(1, 8))
    story.append(Paragraph("2.1 Business Drivers", S['h2']))
    story += bullets([
        "Rapid headcount growth has outstripped existing spreadsheet- and email-based HR processes.",
        "Multiple disconnected tools cause data drift and reconciliation overhead.",
        "Compliance and audit readiness demand a centralized, immutable record of HR transactions.",
        "Distributed teams require a single, branded portal accessible from any device.",
        "Leadership requires real-time, role-based dashboards for workforce decisions.",
    ])
    story.append(PageBreak())

    # 3. Company Overview
    story.append(Paragraph("3. Company Overview — Perfect Solutions", S['h1']))
    story.append(hr())
    story.append(styled_table(
        ["Attribute", "Value"],
        [
            ["Legal Name", "Perfect Solutions"],
            ["Industry", "IT Services & Software Development"],
            ["Company Size", "Medium (51 – 250 employees)"],
            ["Primary Markets", "United States, with offshore engineering presence"],
            ["Brand Tagline", "Unleashing IT Talent"],
            ["Primary Brand Color", "#1E3A8A (Deep Corporate Blue)"],
            ["Secondary Brand Color", "#3B82F6 (Action Blue)"],
            ["Public Website", "www.perfectgroupus.com"],
            ["HRMS Tenant Slug", "perfectsolutions"],
            ["Custom Domain", "hr.perfectsolutions.com"],
            ["Departments In Scope", "Engineering, Sales, Marketing, Finance, HR, General"],
        ],
        [2.0 * inch, 4.6 * inch]
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("3.1 Strategic Context", S['h2']))
    story.append(Paragraph(
        "Perfect Solutions positions itself as a high-velocity IT talent firm. The HR function is therefore not a "
        "back-office cost center but a competitive differentiator: speed of hiring, accuracy of billing for "
        "time-and-materials engagements, and employee retention all flow directly through HR systems. The HRMS is "
        "treated as a Tier-1 business system with stringent uptime, security, and reporting requirements.",
        S['body']))
    story.append(Spacer(1, 8))
    story.append(figure(f"{ASSETS}/modules.png",
                        caption="Figure 5 — HRMS Module Map for Perfect Solutions"))
    story.append(PageBreak())

    # 4. Stakeholders
    story.append(Paragraph("4. Stakeholders & User Personas", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "The following stakeholder map identifies the primary actors who will interact with, sponsor, govern, or be "
        "impacted by the Perfect Solutions HRMS deployment.", S['body']))
    story.append(styled_table(
        ["Stakeholder", "Role", "Influence", "Interest", "Engagement"],
        [
            ["Director, IT Services", "Executive Sponsor", "High", "High", "Steering committee, monthly review"],
            ["Head of Human Resources", "Business Owner", "High", "High", "Weekly working group"],
            ["CFO", "Financial Approver", "High", "Medium", "Budget gates, ROI checkpoints"],
            ["Engineering Manager", "Power User", "Medium", "High", "Pilot user, feedback loop"],
            ["HR Operations Lead", "Day-to-day Owner", "Medium", "High", "UAT, training champion"],
            ["IT Security Officer", "Risk Approver", "High", "Medium", "Security review at each phase"],
            ["Employees (all)", "End Users", "Low", "High", "Onboarding sessions, in-app guides"],
            ["Managers (all departments)", "Approvers", "Medium", "High", "Train-the-trainer model"],
            ["External Auditor", "Compliance Reviewer", "Medium", "Low", "Read-only access at audit time"],
        ],
        [1.8 * inch, 1.4 * inch, 0.8 * inch, 0.8 * inch, 1.9 * inch]
    ))
    story.append(Spacer(1, 10))
    story.append(Paragraph("4.1 Detailed User Personas", S['h2']))
    personas = [
        ("Priya — HR Operations Lead",
         "Manages onboarding, leave approvals, policy enforcement, audit responses.",
         "Manual data entry, chasing managers for approvals, reconciling spreadsheets, generating monthly reports.",
         "A single dashboard with pending approvals, automated reminders, and one-click report exports."),
        ("Daniel — Engineering Manager",
         "Approves time, leave, and ticket escalations for an engineering team of ~25.",
         "Switching between tools, no real-time visibility into team capacity, approvals buried in email.",
         "Mobile-friendly approval queue, team capacity heatmap, project allocation visibility."),
        ("Anita — Software Engineer",
         "Logs hours, requests leave, raises IT helpdesk tickets, downloads payslips.",
         "Forgetting to log time, unclear leave balance, no visibility into ticket status.",
         "Friction-free time entry, instant leave balance, ticket status notifications."),
        ("Marcus — CFO",
         "Approves payroll, monitors workforce cost, reviews compliance posture.",
         "Late or inconsistent reports, lack of trend visibility, manual reconciliation with payroll vendor.",
         "Executive dashboard with cost-per-department, trend charts, exportable payroll registers."),
        ("Sophia — IT Security Officer",
         "Owns access governance, data classification, audit response.",
         "No central audit log, ambiguous role definitions, password sprawl.",
         "Immutable audit trail, granular RBAC, SSO/2FA, encryption at rest and in transit."),
    ]
    for name, role, pain, want in personas:
        story.append(Paragraph(f"<b>{name}</b>",
                     ParagraphStyle('p', parent=S['body'], textColor=PRIMARY,
                                    fontSize=11, fontName='Helvetica-Bold',
                                    spaceBefore=4, spaceAfter=2)))
        story.append(Paragraph(f"<b>Role:</b> {role}", S['body']))
        story.append(Paragraph(f"<b>Pain Points:</b> {pain}", S['body']))
        story.append(Paragraph(f"<b>Desired Outcome:</b> {want}", S['body']))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # 5. Goals
    story.append(Paragraph("5. Business Goals & Success Metrics", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "The following SMART business objectives have been agreed by the Perfect Solutions steering committee. Each "
        "objective is paired with a measurable Key Performance Indicator (KPI) and a target value to be achieved "
        "within two quarters of go-live (T+6 months).", S['body']))
    story.append(styled_table(
        ["#", "Business Goal", "KPI", "Baseline", "Target (T+6m)"],
        [
            ["BG-01", "Centralize all HR data into a single platform",
             "% of HR processes digitized in HRMS", "0%", "≥ 95%"],
            ["BG-02", "Automate attendance / timesheet capture",
             "Manual time-entry corrections / month", "~120", "< 15"],
            ["BG-03", "Reduce leave processing cycle time",
             "Avg. days from request to decision", "3.2 days", "< 1 day"],
            ["BG-04", "Improve internal support responsiveness",
             "Avg. ticket first-response time", "8 hours", "< 2 hours"],
            ["BG-05", "Increase employee self-service adoption",
             "% self-service actions", "30%", "≥ 90%"],
            ["BG-06", "Ensure audit-ready records",
             "Audit findings", "—", "Zero material findings"],
            ["BG-07", "Strengthen brand experience",
             "Employee NPS for HR tools", "+12", "≥ +45"],
            ["BG-08", "Reduce HR operational cost",
             "HR admin hrs / 100 emp / mo", "180", "≤ 70"],
            ["BG-09", "Achieve enterprise-grade availability",
             "Uptime (rolling 30 days)", "—", "≥ 99.9%"],
            ["BG-10", "Enable data-driven workforce planning",
             "Manager dashboard MAU", "—", "≥ 80%"],
        ],
        [0.55 * inch, 1.95 * inch, 1.7 * inch, 1.0 * inch, 1.3 * inch]
    ))
    story.append(PageBreak())

    # 6. Scope
    story.append(Paragraph("6. Scope of the Engagement", S['h1']))
    story.append(hr())
    story.append(Paragraph("6.1 In Scope", S['h2']))
    story += bullets([
        "Multi-tenant deployment of Perfect Solutions HRMS for the perfectsolutions tenant.",
        "White-label branding: logo, primary/secondary colors, custom domain, email sender, browser tab title.",
        "Modules: Auth & RBAC, Employee Directory, Time & Attendance, Leave, Tickets, Calendar, Projects, Documents, Performance, Reports, Chat.",
        "Departments: General, Engineering, HR, Sales, Marketing, Finance.",
        "Leave types: Vacation, Sick, Personal, Unpaid.",
        "Roles: Super Admin, Tenant Admin, HR Manager, People Manager, Employee.",
        "Secure invite-only signup tied to tenant-specific admin invite codes.",
        "Data migration from spreadsheets for active employees and current balances.",
        "Training (admins, managers, employees) and operations runbook.",
        "30-day hypercare post go-live.",
    ])
    story.append(Paragraph("6.2 Out of Scope (Phase 1)", S['h2']))
    story += bullets([
        "Full payroll calculation and statutory tax filing (handled by external payroll provider).",
        "Recruitment / Applicant Tracking System (ATS) — Phase 2.",
        "Learning Management System (LMS) integration — Phase 2.",
        "Biometric hardware integration — Phase 2.",
        "Mobile native applications (iOS/Android) — Phase 2.",
        "Migration of historical (> 24 months) leave and timesheet data.",
    ])
    story.append(Paragraph("6.3 Assumptions", S['h2']))
    story += numbered([
        "Perfect Solutions provides a single, empowered point of contact (SPOC).",
        "Cleansed master data (employees, departments, managers) provided prior to migration.",
        "DNS access for hr.perfectsolutions.com granted for CNAME verification.",
        "9×5 support is acceptable post hypercare; 24×7 a Phase 2 consideration.",
        "Users on modern evergreen browsers (latest two versions).",
        "English-only at go-live.",
    ])
    story.append(Paragraph("6.4 Constraints", S['h2']))
    story += bullets([
        "Go-live before the start of the next fiscal-year planning cycle.",
        "All production data stored in regions compliant with US data protection regulations.",
        "Maximum scheduled downtime: one 2-hour window per month, off-hours.",
        "Fixed implementation budget; scope changes via formal change-control.",
    ])
    story.append(PageBreak())

    # 7. Processes
    story.append(Paragraph("7. Business Processes — Current vs Future", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "The table below summarizes the most impactful HR processes that will transition from manual / semi-digital "
        "to fully automated on Perfect Solutions HRMS.", S['body']))
    story.append(styled_table(
        ["Process", "Current State (As-Is)", "Future State (To-Be)", "Expected Benefit"],
        [
            ["Onboarding",
             "Email-driven, paper forms, manual asset assignment.",
             "Digital workflow, pre-arrival document collection, auto provisioning.",
             "Cycle: 5 days → 1 day."],
            ["Time Tracking",
             "Spreadsheets emailed weekly.",
             "In-app entry, approvals, project tagging, exception alerts.",
             "Billing accuracy +15%."],
            ["Leave Requests",
             "Email + spreadsheet ledger by HR.",
             "Self-service, real-time balance, automated routing, calendar sync.",
             "Cycle < 1 day; zero balance disputes."],
            ["IT Helpdesk",
             "Shared mailbox; no SLA tracking.",
             "Tickets with categories, SLAs, comments, attachments, CSAT.",
             "First response < 2h."],
            ["Performance",
             "Annual, paper-based.",
             "Continuous feedback, quarterly check-ins, OKRs.",
             "Higher engagement & retention insight."],
            ["Audit Response",
             "Manual data pull from many sources.",
             "Single export with immutable audit log.",
             "~70% prep time reduction."],
        ],
        [1.1 * inch, 1.7 * inch, 2.0 * inch, 1.6 * inch]
    ))
    story.append(Spacer(1, 8))
    story.append(figure(f"{ASSETS}/leave_flow.png",
                        caption="Figure 3 — Future-state Leave Request Workflow"))
    story.append(PageBreak())

    # 8. Business Requirements
    story.append(Paragraph("8. Business Requirements", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Each requirement is uniquely identified (BR-NNN), categorized, prioritized using MoSCoW, and traced to a "
        "business goal. Functional decomposition is in the FRD (PS-FRD-2026-001).", S['body']))
    brs = [
        ("BR-001", "Branding", "Display Perfect Solutions branding consistently across pages and outbound email.", "Must", "BG-07"),
        ("BR-002", "Access", "Only invited admins with valid tenant-specific invite codes may sign up.", "Must", "BG-06"),
        ("BR-003", "Access", "Authentication required before any non-public route.", "Must", "BG-06"),
        ("BR-004", "Access", "Enforce RBAC with at minimum five roles.", "Must", "BG-06"),
        ("BR-005", "Employees", "HR can create, update, deactivate, search employees.", "Must", "BG-01"),
        ("BR-006", "Time", "Employees log time daily/weekly with project tagging.", "Must", "BG-02"),
        ("BR-007", "Time", "Managers approve, reject, or request changes on timesheets.", "Must", "BG-02"),
        ("BR-008", "Leave", "Employees view current balance and submit leave requests.", "Must", "BG-03"),
        ("BR-009", "Leave", "Managers approve / reject with notifications.", "Must", "BG-03"),
        ("BR-010", "Leave", "Prevent overlapping or balance-exceeding requests.", "Must", "BG-03"),
        ("BR-011", "Tickets", "Employees raise tickets categorized by department.", "Must", "BG-04"),
        ("BR-012", "Tickets", "Tickets track SLA against configured targets.", "Should", "BG-04"),
        ("BR-013", "Calendar", "Approved leaves and events surface in unified calendar.", "Must", "BG-05"),
        ("BR-014", "Documents", "Employees access pay slips, policies, personal docs.", "Must", "BG-01"),
        ("BR-015", "Reports", "Export workforce, attendance, leave reports (CSV/Excel).", "Must", "BG-10"),
        ("BR-016", "Reports", "Real-time dashboards by dept / role / project.", "Should", "BG-10"),
        ("BR-017", "Notifications", "Approval workflows produce in-app + email notifications.", "Must", "BG-03"),
        ("BR-018", "Audit", "Every state-changing action recorded in immutable audit log ≥ 7 yrs.", "Must", "BG-06"),
        ("BR-019", "Security", "Modern adaptive password hashing; PII encrypted at rest.", "Must", "BG-06"),
        ("BR-020", "Security", "Rate-limited logins; lockout after 5 failures.", "Must", "BG-06"),
        ("BR-021", "Availability", "Maintain ≥ 99.9% monthly uptime.", "Must", "BG-09"),
        ("BR-022", "Performance", "95% of API requests under 500 ms at normal load.", "Should", "BG-09"),
        ("BR-023", "Usability", "Fully responsive UI; WCAG 2.1 AA accessibility.", "Should", "BG-07"),
        ("BR-024", "Self-service", "Employees complete routine HR actions without HR.", "Must", "BG-05"),
        ("BR-025", "Integrations", "Expose REST APIs for payroll, SSO, BI.", "Should", "BG-08"),
        ("BR-026", "Compliance", "Provide data export and deletion for data subject rights.", "Must", "BG-06"),
        ("BR-027", "Localization", "Default tz America/New_York with per-employee override.", "Should", "BG-07"),
        ("BR-028", "Mobile", "Employee flows usable on mobile browsers (≥ 360 px).", "Must", "BG-07"),
        ("BR-029", "Tenant Isolation", "No cross-tenant data accessible from perfectsolutions.", "Must", "BG-06"),
        ("BR-030", "DR", "RPO ≤ 1 hour, RTO ≤ 4 hours.", "Must", "BG-09"),
    ]
    story.append(styled_table(
        ["ID", "Category", "Requirement", "Pri.", "Goal"],
        [list(b) for b in brs],
        [0.6 * inch, 0.95 * inch, 3.4 * inch, 0.6 * inch, 0.55 * inch],
        font_size=8.5
    ))
    story.append(PageBreak())

    # 9. Risks
    story.append(Paragraph("9. Risk Analysis & Mitigation", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Risks scored on Likelihood (L) and Impact (I), 1–5. Score = L × I. Risks ≥ 12 tracked weekly by steering committee.",
        S['body']))
    story.append(styled_table(
        ["ID", "Risk", "L", "I", "Score", "Mitigation", "Owner"],
        [
            ["R-01", "Resistance to change from long-tenured employees", "3", "4", "12",
             "Change-management plan, executive sponsorship, training.", "HR Lead"],
            ["R-02", "Master-data quality issues delay migration", "4", "4", "16",
             "Data-cleansing sprint, phased migration with rollback.", "PMO"],
            ["R-03", "DNS / CNAME setup delays go-live", "2", "3", "6",
             "Pre-validate DNS; fallback to *.hr.perfectsolutions.com.", "IT"],
            ["R-04", "Security incident exposes PII", "2", "5", "10",
             "Encryption, RBAC, audit log, SOC monitoring.", "InfoSec"],
            ["R-05", "Vendor LLM costs exceed budget", "3", "2", "6",
             "Universal Key with budget alerts; cap per-feature spend.", "Finance"],
            ["R-06", "Browser compatibility regressions", "3", "2", "6",
             "Automated cross-browser test suite in CI.", "Eng."],
            ["R-07", "Insufficient mobile experience reduces adoption", "3", "4", "12",
             "Mobile-first review for every employee flow.", "Product"],
            ["R-08", "Unplanned downtime during peak hours", "2", "5", "10",
             "Blue-green deploys, off-hours windows, SRE on-call.", "DevOps"],
            ["R-09", "Cross-tenant data leakage", "1", "5", "5",
             "Tenant-scoped queries, isolation tests in CI.", "Eng."],
            ["R-10", "Audit failure due to incomplete logging", "2", "5", "10",
             "Immutable append-only audit log with verification.", "Compl."],
        ],
        [0.5 * inch, 1.85 * inch, 0.3 * inch, 0.3 * inch, 0.55 * inch, 2.4 * inch, 0.65 * inch],
        font_size=8.5
    ))
    story.append(PageBreak())

    # 10. Compliance
    story.append(Paragraph("10. Regulatory & Compliance Considerations", S['h1']))
    story.append(hr())
    story += bullets([
        "U.S. labor recordkeeping (FLSA): time records ≥ 3 years; payroll-ready exports.",
        "U.S. state-specific paid-sick-leave rules: leave types configurable per policy.",
        "Data privacy: explicit consent, right to access and delete, breach notification within 72 hours.",
        "SOC 2 Type II posture: annual third-party assessment of security, availability, confidentiality.",
        "Internal IT policies: SSO-readiness, password complexity, session timeout (≤ 30 min idle).",
    ])

    # 11. Glossary
    story.append(Paragraph("11. Glossary", S['h1']))
    story.append(hr())
    story.append(styled_table(
        ["Term", "Definition"],
        [
            ["BRD", "Business Requirements Document"],
            ["FRD", "Functional Requirements Document"],
            ["HRMS", "Human Resource Management System"],
            ["MoSCoW", "Prioritization framework: Must / Should / Could / Won't"],
            ["RBAC", "Role-Based Access Control"],
            ["RPO", "Recovery Point Objective"],
            ["RTO", "Recovery Time Objective"],
            ["SLA", "Service Level Agreement"],
            ["SPOC", "Single Point Of Contact"],
            ["SaaS", "Software as a Service"],
            ["Tenant", "Isolated logical instance within multi-tenant SaaS"],
            ["UAT", "User Acceptance Testing"],
            ["WCAG", "Web Content Accessibility Guidelines"],
        ],
        [1.4 * inch, 5.2 * inch]
    ))
    story.append(PageBreak())

    # 12. Sign-off
    story.append(Paragraph("12. Approval & Sign-off", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "The undersigned acknowledge that this Business Requirements Document represents the agreed-upon business "
        "needs of Perfect Solutions for the Perfect Solutions HRMS implementation. Material changes shall be processed "
        "via formal change control.", S['body']))
    story.append(Spacer(1, 8))
    story.append(styled_table(
        ["Role", "Name", "Signature", "Date"],
        [
            ["Executive Sponsor", "Director, IT Services — Perfect Solutions", "_____________________", "__________"],
            ["Business Owner", "Head of HR — Perfect Solutions", "_____________________", "__________"],
            ["Financial Approver", "CFO — Perfect Solutions", "_____________________", "__________"],
            ["Implementation Lead", "IT Delivery", "_____________________", "__________"],
            ["Product Manager", "Product Office", "_____________________", "__________"],
        ],
        [1.5 * inch, 2.7 * inch, 1.7 * inch, 0.7 * inch]
    ))
    story += portal_appendix("A")
    return story


# ===================================================================
# FRD CONTENT
# ===================================================================
def frd_story():
    story = []
    story += cover("Functional Requirements Document", "PS-FRD-2026-001", "1.0")
    story.append(NextPageTemplate('Body'))

    # 1
    story.append(Paragraph("1. Document Control", S['h1']))
    story.append(hr())
    story.append(styled_table(
        ["Version", "Date", "Author", "Reviewer", "Change"],
        [
            ["0.1", "2026-01-18", "Lead Engineer", "Project Manager", "Initial draft from BRD baseline"],
            ["0.5", "2026-01-26", "Lead Engineer", "PS Engineering Manager", "Tech review"],
            ["1.0", date.today().strftime("%Y-%m-%d"), "Project Manager", "PS Steering Committee", "Approved baseline"],
        ],
        [0.7 * inch, 1.1 * inch, 1.7 * inch, 1.7 * inch, 1.5 * inch]
    ))
    story.append(Paragraph("1.1 Reference Documents", S['h2']))
    story += bullets([
        "PS-BRD-2026-001 — Perfect Solutions Business Requirements Document, v1.0",
        "Perfect Solutions HRMS Architecture Specification (Internal)",
        "Perfect Solutions HRMS Security & Compliance Whitepaper (Internal)",
        "Perfect Solutions Brand Guidelines (Internal)",
    ])
    story.append(PageBreak())

    # 2
    story.append(Paragraph("2. Introduction", S['h1']))
    story.append(hr())
    story.append(Paragraph("2.1 Purpose", S['h2']))
    story.append(Paragraph(
        "This Functional Requirements Document (FRD) translates the business requirements captured in the BRD into "
        "discrete, testable functional specifications for the Perfect Solutions HRMS platform deployed for Perfect "
        "Solutions. Each requirement is uniquely identified, mapped back to one or more business requirements, and "
        "accompanied by acceptance criteria that form the basis of UAT.", S['body']))
    story.append(Paragraph("2.2 Intended Audience", S['h2']))
    story += bullets([
        "Perfect Solutions IT and Engineering teams (technical reviewers)",
        "Perfect Solutions HR Operations (process validators)",
        "Internal delivery, engineering, and QA teams (implementers)",
        "Internal and external auditors (compliance reviewers)",
    ])
    story.append(Paragraph("2.3 Document Conventions", S['h2']))
    story += bullets([
        "Functional requirements prefixed FR-NNN; non-functional NFR-NNN.",
        "Use cases prefixed UC-NNN; user stories US-NNN.",
        "Priority follows MoSCoW.",
        "Each requirement traces back to a BRD identifier (BR-NNN).",
    ])
    story.append(PageBreak())

    # 3 System Overview
    story.append(Paragraph("3. System Overview", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "The Perfect Solutions HRMS is a multi-tenant SaaS platform that comprising a React single-page application, a FastAPI backend, and "
        "a MongoDB persistence tier on Kubernetes. For Perfect Solutions the platform is delivered as a fully "
        "white-labeled tenant identified by the slug 'perfectsolutions', accessible at hr.perfectsolutions.com.",
        S['body']))
    story.append(figure(f"{ASSETS}/architecture.png",
                        caption="Figure 1 — System Architecture (Multi-Tenant SaaS)"))
    story.append(Paragraph("3.1 Technology Stack", S['h2']))
    story.append(styled_table(
        ["Layer", "Technology", "Purpose"],
        [
            ["Frontend", "React 18, TailwindCSS, react-router-dom, Framer Motion", "UI, animations, routing"],
            ["State", "React Context API, hooks", "Auth, tenant, theming"],
            ["Backend", "FastAPI (Python 3.11), Pydantic v2", "REST API, validation, OpenAPI"],
            ["Database", "MongoDB (test_database)", "Tenant-scoped persistence"],
            ["Auth", "JWT (HS256), bcrypt", "Stateless authentication"],
            ["AI", "Emergent Universal Key (Claude / GPT / Gemini)", "AI assistant inside HRMS"],
            ["PDF", "ReportLab", "Server-side document generation"],
            ["Calendar", "react-big-calendar", "Calendar UX"],
            ["Hosting", "Kubernetes (Emergent Platform)", "Orchestration, ingress, TLS"],
        ],
        [1.2 * inch, 2.8 * inch, 2.6 * inch]
    ))
    story.append(Paragraph("3.2 Tenant Resolution & White-Labeling", S['h2']))
    story += bullets([
        "Tenant resolution via slug path or custom domain (hr.perfectsolutions.com).",
        "Frontend calls GET /api/tenants/by-slug/{slug} or /by-domain to fetch metadata.",
        "Tenant metadata drives logo, colors, browser tab title, and feature flags.",
        "All API calls implicitly carry tenant context via JWT 'tenant_id' claim.",
    ])
    story.append(PageBreak())

    # 4 Roles
    story.append(Paragraph("4. User Roles & Permission Matrix", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Roles below are scoped to the Perfect Solutions tenant. Super Admin is platform-level and reserved for "
        "IT operations.", S['body']))
    story.append(styled_table(
        ["Capability", "Super Admin", "Tenant Admin", "HR Mgr.", "People Mgr.", "Employee"],
        [
            ["Manage tenants & branding", "✓", "—", "—", "—", "—"],
            ["Create/Edit Employees", "—", "✓", "✓", "—", "—"],
            ["Approve Timesheet", "—", "✓", "✓", "✓ (team)", "—"],
            ["Approve Leave", "—", "✓", "✓", "✓ (team)", "—"],
            ["Submit Timesheet / Leave", "—", "✓", "✓", "✓", "✓"],
            ["Raise Tickets", "—", "✓", "✓", "✓", "✓"],
            ["Resolve Tickets", "—", "✓", "✓", "✓ (assigned)", "—"],
            ["View All Reports", "✓", "✓", "✓", "Team only", "Self only"],
            ["Configure Departments / Leave Types", "—", "✓", "✓", "—", "—"],
            ["Audit Log Access", "✓", "✓", "Read-only", "—", "—"],
        ],
        [2.0 * inch, 0.9 * inch, 0.95 * inch, 0.75 * inch, 0.95 * inch, 0.85 * inch],
        font_size=8.5
    ))
    story.append(PageBreak())

    # 5 Functional Modules
    story.append(Paragraph("5. Functional Modules", S['h1']))
    story.append(hr())

    # 5.1 Auth
    story.append(Paragraph("5.1 Authentication & Onboarding", S['h2']))
    story.append(figure(f"{ASSETS}/auth_flow.png", width=6.4 * inch,
                        caption="Figure 2 — Authentication & Tenant Resolution Flow"))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-001", "Allow new admin signup only with valid tenant-specific invite code.", "Must", "BR-002"],
            ["FR-002", "Validate code against tenants collection; reject with 'Invalid admin invite code'.", "Must", "BR-002"],
            ["FR-003", "Hash passwords using bcrypt with work factor ≥ 12.", "Must", "BR-019"],
            ["FR-004", "Issue JWT containing user_id, tenant_id, role, expiry on successful login.", "Must", "BR-003"],
            ["FR-005", "Lock account after 5 failed attempts within 15 min; lock duration 30 min.", "Must", "BR-020"],
            ["FR-006", "Allow password reset via tokenized link sent to registered email.", "Should", "BR-019"],
            ["FR-007", "Expire idle sessions after 30 min of inactivity.", "Must", "BR-019"],
            ["FR-008", "Display Perfect Solutions branding on all auth pages.", "Must", "BR-001"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))
    story.append(Paragraph("5.1.1 Use Case — UC-001 Admin Self-Onboarding", S['h3']))
    story.append(styled_table(
        ["Field", "Detail"],
        [
            ["Actor", "Prospective Tenant Admin at Perfect Solutions"],
            ["Pre-condition", "Valid admin invite code received via secure channel."],
            ["Trigger", "User navigates to hr.perfectsolutions.com/signup"],
            ["Main Flow",
             "1) User enters name, email, password, admin code.<br/>"
             "2) System validates code against perfectsolutions tenant.<br/>"
             "3) System creates user with role TENANT_ADMIN.<br/>"
             "4) JWT issued; user redirected to admin dashboard."],
            ["Alt Flow A1", "Invite code invalid → display error and abort signup."],
            ["Alt Flow A2", "Email already registered → prompt to log in instead."],
            ["Post-condition", "User account created, audit log entry written."],
            ["Acceptance",
             "Given a valid admin code, when the user submits the signup form with valid data, then the account is created and the dashboard loads within 2 seconds."],
        ],
        [1.4 * inch, 5.2 * inch]
    ))
    story.append(PageBreak())

    # 5.2 Employees
    story.append(Paragraph("5.2 Employee Management", S['h2']))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-010", "HR creates an employee record with name, email, dept, role, manager, join date.", "Must", "BR-005"],
            ["FR-011", "HR edits any employee field except immutable identifiers.", "Must", "BR-005"],
            ["FR-012", "HR deactivates (soft-delete) an employee; deactivated users cannot log in.", "Must", "BR-005"],
            ["FR-013", "HR searches and filters employees by name, dept, manager, status.", "Should", "BR-005"],
            ["FR-014", "Employees view and update profile photo, contact, and emergency contact.", "Must", "BR-024"],
            ["FR-015", "Enforce email uniqueness within a tenant.", "Must", "BR-005"],
            ["FR-016", "Department list tenant-configurable; defaults: General, Engineering, HR, Sales, Marketing, Finance.", "Must", "BR-005"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))

    # 5.3 Time
    story.append(Paragraph("5.3 Time & Attendance", S['h2']))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-020", "Employees log time entries per day with project, task, hours.", "Must", "BR-006"],
            ["FR-021", "Employees save drafts and submit weekly.", "Must", "BR-006"],
            ["FR-022", "Managers approve, reject (with reason), or request changes.", "Must", "BR-007"],
            ["FR-023", "Flag timesheets > 60 hours/week as exceptions.", "Should", "BR-006"],
            ["FR-024", "Approved timesheets locked from edits except by HR.", "Must", "BR-007"],
            ["FR-025", "Weekly utilization report per project.", "Should", "BR-015"],
            ["FR-026", "Time entries exportable in CSV/Excel.", "Must", "BR-015"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))

    # 5.4 Leave
    story.append(Paragraph("5.4 Leave Management", S['h2']))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-030", "Employees view current leave balance per leave type.", "Must", "BR-008"],
            ["FR-031", "Employees submit leave requests with type, start, end, reason.", "Must", "BR-008"],
            ["FR-032", "Reject requests exceeding balance or overlapping approved leave.", "Must", "BR-010"],
            ["FR-033", "Managers approve/reject with optional comments.", "Must", "BR-009"],
            ["FR-034", "Approved leave deducts balance and adds calendar entry visible to team.", "Must", "BR-013"],
            ["FR-035", "Email + in-app notifications on submit, approval, rejection.", "Must", "BR-017"],
            ["FR-036", "HR configures leave types, accrual, carry-over per leave type.", "Must", "BR-008"],
            ["FR-037", "Default leave types: Vacation, Sick, Personal, Unpaid.", "Must", "BR-008"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))
    story.append(figure(f"{ASSETS}/leave_flow.png", width=6.0 * inch,
                        caption="Figure 3 — Leave Workflow"))
    story.append(PageBreak())

    # 5.5 Tickets
    story.append(Paragraph("5.5 Tickets / Helpdesk", S['h2']))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-040", "Employees raise tickets with subject, description, category, priority, attachments.", "Must", "BR-011"],
            ["FR-041", "Tickets auto-routed by category to dept queue.", "Must", "BR-011"],
            ["FR-042", "Agents comment, change status, reassign, close.", "Must", "BR-011"],
            ["FR-043", "Track first-response and resolution SLA, warn when at risk.", "Should", "BR-012"],
            ["FR-044", "Notify requesters on status change; reopen within 7 days.", "Must", "BR-017"],
            ["FR-045", "Threaded chat-style conversation per ticket (polling).", "Must", "BR-011"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))

    # 5.6 Calendar
    story.append(Paragraph("5.6 Calendar & Scheduling", S['h2']))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-050", "Unified calendar combining approved leaves, company events, personal events.", "Must", "BR-013"],
            ["FR-051", "Users create personal/team events with title, start, end, attendees.", "Must", "BR-013"],
            ["FR-052", "Managers view team availability heatmap by week.", "Should", "BR-016"],
            ["FR-053", "Calendar offers Day, Week, Month, Agenda views.", "Must", "BR-013"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))

    # 5.7 Documents
    story.append(Paragraph("5.7 Document Vault", S['h2']))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-060", "Employees download personal documents (offer letters, payslips, policy ack).", "Must", "BR-014"],
            ["FR-061", "HR uploads company-wide policy documents available to all employees.", "Must", "BR-014"],
            ["FR-062", "Documents stored encrypted at rest, accessible only to authorized roles.", "Must", "BR-019"],
            ["FR-063", "Document downloads audit-logged.", "Must", "BR-018"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))

    # 5.8 Performance
    story.append(Paragraph("5.8 Performance Reviews", S['h2']))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-070", "Managers create review cycles with self, peer, and manager assessments.", "Should", "BG-07"],
            ["FR-071", "Employees set quarterly goals (OKRs) and update progress.", "Should", "BG-07"],
            ["FR-072", "HR views aggregate performance trends by department.", "Could", "BG-10"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))

    # 5.9 Reports
    story.append(Paragraph("5.9 Reports & Analytics", S['h2']))
    story.append(styled_table(
        ["FR ID", "Functional Requirement", "Pri.", "Trace"],
        [
            ["FR-080", "Standard reports: Headcount, Attendance, Leave Utilization, Ticket SLA, Project Utilization.", "Must", "BR-015"],
            ["FR-081", "Filter by date range, department, project.", "Must", "BR-015"],
            ["FR-082", "Export reports as CSV and Excel.", "Must", "BR-015"],
            ["FR-083", "Dashboards refresh in near real-time (< 1 min lag).", "Should", "BR-016"],
        ],
        [0.7 * inch, 4.6 * inch, 0.6 * inch, 0.6 * inch],
        font_size=9
    ))
    story.append(PageBreak())

    # 6 User Stories
    story.append(Paragraph("6. User Stories with Acceptance Criteria", S['h1']))
    story.append(hr())
    stories_data = [
        ["US-01", "As an Employee, I want to submit a leave request from my phone so that I do not need to be at my desk.",
         "Given I am authenticated on a mobile browser, when I open Leave → New Request, then I can submit and see a confirmation toast within 2 seconds."],
        ["US-02", "As a Manager, I want a single approval queue so that I do not switch contexts between leave, time, and tickets.",
         "Given I have pending approvals across modules, when I open My Approvals, then I see a unified list ordered by SLA risk."],
        ["US-03", "As HR, I want to bulk import employees from a spreadsheet so that I avoid manual entry during onboarding waves.",
         "Given a CSV in the standard template, when I upload it, then valid rows are imported and errors are downloadable as a per-row report."],
        ["US-04", "As an Admin, I want browser tab titles to display 'Perfect Solutions — HR Portal' so brand identity is preserved.",
         "Given any page on hr.perfectsolutions.com, then the tab title contains 'Perfect Solutions' and never a generic platform string."],
        ["US-05", "As an Auditor, I want to download an immutable audit log for any date range so that I can reconcile changes.",
         "Given Auditor role, when I request the export, then a CSV with timestamp, actor, action, before/after states is produced."],
        ["US-06", "As an Employee, I want to see my real-time leave balance before I submit a request so that I avoid rejections.",
         "Given my leave page, when I select a leave type and dates, then the projected remaining balance is shown live."],
        ["US-07", "As a Manager, I want to be notified within 1 minute of an SLA-at-risk ticket on my queue.",
         "Given a ticket within 80% of its SLA window, when polling fires, then the agent receives an in-app warning and an email."],
        ["US-08", "As HR, I want to configure leave types per policy so that I can adapt to state-specific sick-leave laws.",
         "Given Tenant Admin role, when I edit leave types, then changes apply prospectively without affecting historical balances."],
    ]
    story.append(styled_table(
        ["ID", "User Story", "Acceptance Criteria"],
        stories_data,
        [0.6 * inch, 2.7 * inch, 3.0 * inch],
        font_size=8.8
    ))
    story.append(PageBreak())

    # 7 Data Model
    story.append(Paragraph("7. Data Model", S['h1']))
    story.append(hr())
    story.append(figure(f"{ASSETS}/erd.png", caption="Figure 4 — Core Data Model (Simplified ERD)"))
    story.append(Paragraph(
        "All collections are tenant-scoped: every persisted document carries an indexed tenant_id field. Backend "
        "queries automatically constrain by JWT-resolved tenant_id; integration tests verify no API call may return "
        "another tenant's data.", S['body']))
    story.append(Paragraph("7.1 Key Collections", S['h2']))
    story.append(styled_table(
        ["Collection", "Cardinality", "Indexes", "Notes"],
        [
            ["tenants", "1 per company", "slug (unique), custom_domain (unique sparse)", "Branding, settings, invite code"],
            ["users", "1..N per tenant", "tenant_id+email (unique)", "Auth + role"],
            ["employees", "1..1 with users", "tenant_id, manager_id", "Profile data"],
            ["timesheets", "Many", "tenant_id+employee_id+date", "Locked after approval"],
            ["leave_requests", "Many", "tenant_id+employee_id, status", "Approval workflow"],
            ["tickets", "Many", "tenant_id+status, assigned_to", "SLA-tracked"],
            ["calendar_events", "Many", "tenant_id+start", "Includes leave-derived events"],
            ["documents", "Many", "tenant_id+owner_id", "Encrypted at rest"],
            ["audit_logs", "Many (append-only)", "tenant_id+timestamp", "Immutable"],
        ],
        [1.2 * inch, 1.3 * inch, 2.3 * inch, 1.8 * inch],
        font_size=9
    ))
    story.append(PageBreak())

    # 8 APIs
    story.append(Paragraph("8. API Surface (Representative)", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "All backend endpoints are prefixed with /api and require a valid JWT (except the explicitly public ones). "
        "Tenant context is derived from the JWT's tenant_id claim. The full OpenAPI specification is generated by "
        "FastAPI at /api/docs.", S['body']))
    story.append(styled_table(
        ["Method", "Endpoint", "Purpose", "Auth"],
        [
            ["POST", "/api/auth/signup", "Tenant admin sign-up with invite code", "Public"],
            ["POST", "/api/auth/login", "Login, returns JWT", "Public"],
            ["GET",  "/api/tenants/by-slug/{slug}", "Resolve tenant by slug", "Public"],
            ["GET",  "/api/tenants/by-domain", "Resolve tenant by custom domain", "Public"],
            ["GET",  "/api/employees", "List tenant employees", "Authenticated"],
            ["POST", "/api/employees", "Create employee", "Tenant Admin / HR"],
            ["GET",  "/api/timesheets", "List timesheets (filtered)", "Authenticated"],
            ["POST", "/api/timesheets", "Create / submit timesheet", "Employee+"],
            ["POST", "/api/timesheets/{id}/approve", "Approve timesheet", "Manager+"],
            ["GET",  "/api/leave/balance", "Get leave balance", "Authenticated"],
            ["POST", "/api/leave/request", "Submit leave request", "Employee+"],
            ["POST", "/api/leave/{id}/approve", "Approve leave", "Manager+"],
            ["POST", "/api/tickets", "Create ticket", "Authenticated"],
            ["GET",  "/api/tickets/{id}", "Get ticket detail incl. comments", "Authenticated"],
            ["GET",  "/api/calendar/events", "List events for visible range", "Authenticated"],
            ["GET",  "/api/reports/{type}", "Generate report (CSV/JSON)", "HR / Admin"],
            ["GET",  "/api/audit-logs", "Read-only audit log", "Admin / Auditor"],
        ],
        [0.7 * inch, 2.7 * inch, 2.4 * inch, 0.9 * inch],
        font_size=9
    ))
    story.append(PageBreak())

    # 9 NFR
    story.append(Paragraph("9. Non-Functional Requirements", S['h1']))
    story.append(hr())
    story.append(styled_table(
        ["NFR ID", "Category", "Requirement", "Target"],
        [
            ["NFR-001", "Performance", "API response under normal load", "p95 < 500 ms; p99 < 1.2 s"],
            ["NFR-002", "Performance", "Time-to-interactive on dashboard", "< 2.5 s on 4G"],
            ["NFR-003", "Availability", "Monthly uptime (excl. planned)", "≥ 99.9%"],
            ["NFR-004", "Scalability", "Concurrent active users / tenant", "≥ 1,000"],
            ["NFR-005", "Scalability", "Records per collection", "≥ 10 million"],
            ["NFR-006", "Security", "Password hashing", "bcrypt (cost ≥ 12)"],
            ["NFR-007", "Security", "Transport encryption", "TLS 1.2+"],
            ["NFR-008", "Security", "Storage encryption", "AES-256 at rest for PII"],
            ["NFR-009", "Security", "Tenant isolation", "100% verified by tests"],
            ["NFR-010", "Privacy", "Data subject access response", "≤ 30 days"],
            ["NFR-011", "Reliability", "RPO", "≤ 1 hour"],
            ["NFR-012", "Reliability", "RTO", "≤ 4 hours"],
            ["NFR-013", "Usability", "Accessibility", "WCAG 2.1 AA"],
            ["NFR-014", "Compatibility", "Supported browsers", "Latest 2 versions"],
            ["NFR-015", "Mobile", "Responsive layout", "≥ 360 px width"],
            ["NFR-016", "Audit", "Audit log retention", "≥ 7 years"],
            ["NFR-017", "Maintainability", "Backend test coverage", "≥ 80%"],
            ["NFR-018", "Observability", "Logs + metrics + traces", "100% endpoints"],
            ["NFR-019", "Localization", "Default time zone", "America/New_York"],
            ["NFR-020", "Compliance", "Audit-ready evidence collection", "≤ 5 business days"],
        ],
        [0.8 * inch, 1.2 * inch, 2.8 * inch, 1.8 * inch],
        font_size=9
    ))
    story.append(PageBreak())

    # 10 Risks
    story.append(Paragraph("10. Functional Risk Analysis", S['h1']))
    story.append(hr())
    story.append(styled_table(
        ["ID", "Risk", "Probability", "Impact", "Mitigation"],
        [
            ["FRK-01", "Race condition on leave balance during concurrent submissions", "Medium", "High",
             "Optimistic concurrency check; server-authoritative deduction in single transaction."],
            ["FRK-02", "Browser tab title regressions on tenant context change", "Medium", "Low",
             "Centralized useBrowserTitle hook keyed on tenant resolution."],
            ["FRK-03", "Custom domain CNAME misconfiguration", "Medium", "Medium",
             "Pre-flight DNS check + admin-visible verification status."],
            ["FRK-04", "Incomplete role enforcement on new endpoints", "Medium", "High",
             "RBAC decorator pattern enforced via lint + integration tests."],
            ["FRK-05", "MongoDB ObjectId leakage in API responses", "Low", "Medium",
             "Pydantic response models, _id excluded by default, contract tests."],
            ["FRK-06", "Duplicate /auth/signup routes leading to inconsistent validation", "Confirmed", "Medium",
             "Refactor server.py to remove duplicate; consolidate into routes/auth.py."],
            ["FRK-07", "Email deliverability for notifications", "Medium", "Medium",
             "Authenticated SMTP/Resend with SPF, DKIM, DMARC."],
        ],
        [0.7 * inch, 2.0 * inch, 0.9 * inch, 0.7 * inch, 2.3 * inch],
        font_size=8.8
    ))
    story.append(PageBreak())

    # 11 Traceability
    story.append(Paragraph("11. Traceability Matrix (BR → FR → UC / US)", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Every business requirement is satisfied by one or more functional requirements, validated by use cases or "
        "user stories, and verified by acceptance test cases.", S['body']))
    story.append(styled_table(
        ["Business Req.", "Functional Req.", "Use Cases / Stories", "Test Method"],
        [
            ["BR-001 Branding", "FR-008", "UC-001, US-04", "Visual + automated regression"],
            ["BR-002 Invite-only signup", "FR-001, FR-002", "UC-001", "Functional + negative tests"],
            ["BR-003 Auth required", "FR-004, FR-007", "UC-001", "API + UI session tests"],
            ["BR-004 RBAC", "FR-001..FR-008, role matrix", "UC-001", "Role permutation tests"],
            ["BR-005 Employee CRUD", "FR-010..FR-016", "US-03", "CRUD test suite"],
            ["BR-006/7 Time", "FR-020..FR-026", "US-02", "Workflow + approval tests"],
            ["BR-008..10 Leave", "FR-030..FR-037", "US-01, US-06, US-08", "Workflow + balance tests"],
            ["BR-011/12 Tickets", "FR-040..FR-045", "US-07", "SLA + workflow tests"],
            ["BR-013 Calendar", "FR-050..FR-053", "US-01", "Cross-module integration"],
            ["BR-014 Documents", "FR-060..FR-063", "—", "Permission + audit tests"],
            ["BR-015/16 Reports", "FR-080..FR-083", "—", "Snapshot + export tests"],
            ["BR-017 Notifications", "FR-035, FR-044", "US-07", "Email + in-app tests"],
            ["BR-018 Audit", "FR-063 + audit_logs", "US-05", "Append-only verification"],
            ["BR-019/20 Security", "FR-003..FR-005, NFR-006..009", "—", "Pen test + automated checks"],
            ["BR-021 Availability", "NFR-003", "—", "Synthetic monitoring"],
            ["BR-022 Performance", "NFR-001, NFR-002", "—", "Load test"],
            ["BR-023 Accessibility", "NFR-013", "—", "Axe / Lighthouse audit"],
            ["BR-024 Self-service", "FR-014, FR-031, FR-040", "US-01", "End-to-end flow tests"],
            ["BR-025 Integrations", "API surface", "—", "Contract tests"],
            ["BR-026 Privacy", "NFR-010", "US-05", "DSAR drill"],
            ["BR-027 Localization", "NFR-019", "—", "TZ regression tests"],
            ["BR-028 Mobile", "NFR-015", "US-01", "Mobile viewport tests"],
            ["BR-029 Tenant isolation", "NFR-009", "—", "Cross-tenant fuzz tests"],
            ["BR-030 DR", "NFR-011, NFR-012", "—", "DR drill"],
        ],
        [1.7 * inch, 1.6 * inch, 1.7 * inch, 1.6 * inch],
        font_size=8.8
    ))
    story.append(PageBreak())

    # 12 UAT
    story.append(Paragraph("12. UAT Strategy & Exit Criteria", S['h1']))
    story.append(hr())
    story += bullets([
        "Three UAT cycles: smoke, full regression, and pre-prod soak.",
        "Test data set: 50 sample employees, 5 managers, 3 departments to start.",
        "Defect severities: S1 Blocker, S2 Major, S3 Minor, S4 Cosmetic.",
        "Exit criteria: Zero S1, zero S2, < 5 S3 open at sign-off.",
        "Performance gate: NFR-001/002 met under 2× expected load.",
        "Security gate: Pen test report with zero High findings outstanding.",
    ])

    # 13 Glossary
    story.append(Paragraph("13. Glossary", S['h1']))
    story.append(hr())
    story.append(styled_table(
        ["Term", "Definition"],
        [
            ["FR / NFR", "Functional / Non-Functional Requirement"],
            ["JWT", "JSON Web Token — signed, stateless auth token"],
            ["MoSCoW", "Must / Should / Could / Won't priority framework"],
            ["RBAC", "Role-Based Access Control"],
            ["SLA", "Service Level Agreement"],
            ["UAT", "User Acceptance Testing"],
            ["WCAG", "Web Content Accessibility Guidelines"],
            ["RPO/RTO", "Recovery Point / Time Objectives"],
            ["DSAR", "Data Subject Access Request"],
        ],
        [1.4 * inch, 5.2 * inch]
    ))
    story.append(PageBreak())

    # 14 Sign-off
    story.append(Paragraph("14. Approval & Sign-off", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "By signing below, the parties acknowledge that this Functional Requirements Document accurately translates "
        "the business needs into implementable functional and non-functional specifications.", S['body']))
    story.append(Spacer(1, 8))
    story.append(styled_table(
        ["Role", "Name", "Signature", "Date"],
        [
            ["Engineering Manager", "Perfect Solutions", "_____________________", "__________"],
            ["IT Security Officer", "Perfect Solutions", "_____________________", "__________"],
            ["Head of HR Operations", "Perfect Solutions", "_____________________", "__________"],
            ["Lead Engineer", "Internal Engineering", "_____________________", "__________"],
            ["Product Manager", "Product Office", "_____________________", "__________"],
        ],
        [1.7 * inch, 2.4 * inch, 1.7 * inch, 0.7 * inch]
    ))
    story += portal_appendix("A")
    return story


def main():
    brd_path = f"{OUT}/Perfect_Solutions_BRD_v1.0.pdf"
    doc = build_doc(brd_path, "Perfect Solutions • Business Requirements Document")
    doc.build(brd_story())
    print(f"BRD PDF saved → {brd_path}")

    frd_path = f"{OUT}/Perfect_Solutions_FRD_v1.0.pdf"
    doc = build_doc(frd_path, "Perfect Solutions • Functional Requirements Document")
    doc.build(frd_story())
    print(f"FRD PDF saved → {frd_path}")


if __name__ == "__main__":
    main()
