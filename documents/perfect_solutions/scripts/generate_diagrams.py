"""Generate architecture and flow diagrams for Perfect Solutions BRD/FRD."""
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os

OUT = "/app/documents/perfect_solutions/assets"
os.makedirs(OUT, exist_ok=True)

PRIMARY = "#1E3A8A"
SECONDARY = "#3B82F6"
ACCENT = "#DBEAFE"
DARK = "#0F172A"
LIGHT = "#F8FAFC"
GRAY = "#64748B"


def styled_box(ax, x, y, w, h, label, fill=ACCENT, edge=PRIMARY, fontcolor=DARK, fontsize=10, bold=True):
    box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.05",
                         linewidth=1.5, edgecolor=edge, facecolor=fill)
    ax.add_patch(box)
    weight = 'bold' if bold else 'normal'
    ax.text(x + w / 2, y + h / 2, label, ha='center', va='center',
            fontsize=fontsize, color=fontcolor, fontweight=weight, wrap=True)


def arrow(ax, x1, y1, x2, y2, color=PRIMARY, style='-|>', lw=1.4):
    a = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style,
                        mutation_scale=14, color=color, linewidth=lw)
    ax.add_patch(a)


# 1. SYSTEM ARCHITECTURE
fig, ax = plt.subplots(figsize=(12, 7.5))
ax.set_xlim(0, 12); ax.set_ylim(0, 8); ax.axis('off')
ax.set_title("Figure 1 — System Architecture (Multi-Tenant SaaS)",
             fontsize=14, fontweight='bold', color=PRIMARY, pad=12)

# Client tier
styled_box(ax, 0.5, 6.3, 2.4, 1.0, "Web Browser\n(Employee / Manager)", fill="#FFFFFF")
styled_box(ax, 3.2, 6.3, 2.4, 1.0, "Web Browser\n(HR / Admin)", fill="#FFFFFF")
styled_box(ax, 5.9, 6.3, 2.4, 1.0, "Mobile Browser\n(Field Staff)", fill="#FFFFFF")
styled_box(ax, 8.6, 6.3, 3.0, 1.0, "Custom Domain\nhr.perfectsolutions.com", fill="#FFFFFF", edge=SECONDARY)

# CDN / Edge
styled_box(ax, 1.5, 5.0, 9.0, 0.7, "Kubernetes Ingress / TLS Termination / CDN", fill=SECONDARY, fontcolor="#FFFFFF")

# Frontend
styled_box(ax, 1.5, 3.7, 4.2, 0.9, "React SPA (Tailwind)\nTenant Resolver • Theming • Routing", fill=ACCENT)
# Backend
styled_box(ax, 6.3, 3.7, 4.2, 0.9, "FastAPI Backend\n/api/* routes • JWT Auth • RBAC", fill=ACCENT)

# Services row
services = ["Auth", "Employee", "Timesheet", "Leave", "Tickets", "Calendar", "Reports"]
for i, s in enumerate(services):
    styled_box(ax, 0.4 + i * 1.65, 2.4, 1.45, 0.7, s, fill="#FFFFFF", fontsize=9)

# Data tier
styled_box(ax, 1.0, 0.9, 3.0, 0.9, "MongoDB\n(test_database, multi-tenant)", fill=PRIMARY, fontcolor="#FFFFFF")
styled_box(ax, 4.3, 0.9, 3.0, 0.9, "Object Storage\n(Documents, Logos)", fill=PRIMARY, fontcolor="#FFFFFF")
styled_box(ax, 7.6, 0.9, 3.0, 0.9, "LLM Provider\n(Emergent Universal Key)", fill=PRIMARY, fontcolor="#FFFFFF")

# Arrows
for x in [1.7, 4.4, 7.1, 10.1]:
    arrow(ax, x, 6.3, x, 5.7)
arrow(ax, 6.0, 5.0, 6.0, 4.6)
arrow(ax, 5.7, 4.15, 6.3, 4.15)
arrow(ax, 6.3, 4.15, 5.7, 4.15)
arrow(ax, 8.4, 3.7, 8.4, 3.1)
arrow(ax, 4.0, 3.7, 4.0, 3.1)
arrow(ax, 2.5, 2.4, 2.5, 1.8)
arrow(ax, 5.8, 2.4, 5.8, 1.8)
arrow(ax, 9.1, 2.4, 9.1, 1.8)

plt.tight_layout()
plt.savefig(f"{OUT}/architecture.png", dpi=160, bbox_inches='tight', facecolor='white')
plt.close()
print("architecture.png")

# 2. AUTHENTICATION FLOW
fig, ax = plt.subplots(figsize=(12, 5.5))
ax.set_xlim(0, 12); ax.set_ylim(0, 6); ax.axis('off')
ax.set_title("Figure 2 — Authentication & Tenant Resolution Flow",
             fontsize=14, fontweight='bold', color=PRIMARY, pad=10)

steps = [
    (0.3, "User opens\nperfectsolutions"),
    (2.3, "Frontend resolves\ntenant from URL"),
    (4.3, "GET /api/tenants/\nby-slug"),
    (6.3, "User submits\nlogin form"),
    (8.3, "POST /api/auth/login\n(email, password,\ntenant_id)"),
    (10.3, "JWT issued +\nDashboard loads"),
]
for x, label in steps:
    styled_box(ax, x, 3.4, 1.7, 1.4, label, fill=ACCENT, fontsize=9)

for i in range(len(steps) - 1):
    arrow(ax, steps[i][0] + 1.7, 4.1, steps[i + 1][0], 4.1)

# Failure branch
styled_box(ax, 4.3, 1.4, 1.7, 1.0, "401 / 403\nReturn error", fill="#FEE2E2", edge="#B91C1C", fontsize=9)
styled_box(ax, 6.3, 1.4, 1.7, 1.0, "Brute-force\ncounter ++", fill="#FEE2E2", edge="#B91C1C", fontsize=9)
arrow(ax, 9.15, 3.4, 7.15, 2.4, color="#B91C1C")
arrow(ax, 7.15, 1.9, 5.15, 1.9, color="#B91C1C", style='-|>')

ax.text(6, 0.4, "On invalid credentials → log attempt, increment fail counter,\n"
        "lock account after 5 attempts within 15 minutes.",
        ha='center', fontsize=9, color=GRAY, style='italic')

plt.tight_layout()
plt.savefig(f"{OUT}/auth_flow.png", dpi=160, bbox_inches='tight', facecolor='white')
plt.close()
print("auth_flow.png")

# 3. LEAVE WORKFLOW
fig, ax = plt.subplots(figsize=(12, 6))
ax.set_xlim(0, 12); ax.set_ylim(0, 6.5); ax.axis('off')
ax.set_title("Figure 3 — Leave Request Workflow",
             fontsize=14, fontweight='bold', color=PRIMARY, pad=10)

styled_box(ax, 0.4, 4.5, 2.2, 1.2, "Employee\nsubmits leave\nrequest", fill=ACCENT)
styled_box(ax, 3.2, 4.5, 2.2, 1.2, "Validation\n(balance, dates,\noverlap)", fill=ACCENT)
styled_box(ax, 6.0, 4.5, 2.2, 1.2, "Manager\nnotified", fill=ACCENT)
styled_box(ax, 8.8, 4.5, 2.8, 1.2, "Manager Approves\nor Rejects", fill=SECONDARY, fontcolor="#FFFFFF")

arrow(ax, 2.6, 5.1, 3.2, 5.1)
arrow(ax, 5.4, 5.1, 6.0, 5.1)
arrow(ax, 8.2, 5.1, 8.8, 5.1)

styled_box(ax, 4.0, 2.0, 2.5, 1.1, "APPROVED\nDeduct balance\nUpdate calendar", fill="#DCFCE7", edge="#15803D")
styled_box(ax, 7.0, 2.0, 2.5, 1.1, "REJECTED\nNotify employee\nLog reason", fill="#FEE2E2", edge="#B91C1C")

arrow(ax, 9.5, 4.5, 5.2, 3.1, color="#15803D")
arrow(ax, 10.0, 4.5, 8.2, 3.1, color="#B91C1C")

styled_box(ax, 4.0, 0.3, 5.5, 1.0, "Email + In-app notification to employee + HR", fill="#FFFFFF", fontsize=10)
arrow(ax, 5.2, 2.0, 6.0, 1.3)
arrow(ax, 8.2, 2.0, 7.5, 1.3)

plt.tight_layout()
plt.savefig(f"{OUT}/leave_flow.png", dpi=160, bbox_inches='tight', facecolor='white')
plt.close()
print("leave_flow.png")

# 4. ENTITY RELATIONSHIP (simplified)
fig, ax = plt.subplots(figsize=(12, 7.5))
ax.set_xlim(0, 12); ax.set_ylim(0, 8); ax.axis('off')
ax.set_title("Figure 4 — Core Data Model (Simplified ER Diagram)",
             fontsize=14, fontweight='bold', color=PRIMARY, pad=12)

entities = {
    "Tenant":        (0.5, 6.0, ["id (PK)", "slug", "name", "logo_url", "primary_color", "settings"]),
    "User":          (4.5, 6.0, ["id (PK)", "tenant_id (FK)", "email", "role", "password_hash"]),
    "Employee":      (8.5, 6.0, ["id (PK)", "user_id (FK)", "department", "manager_id", "join_date"]),
    "Timesheet":     (0.5, 3.0, ["id (PK)", "employee_id (FK)", "date", "hours", "project_id"]),
    "LeaveRequest":  (4.5, 3.0, ["id (PK)", "employee_id (FK)", "type", "start_date", "end_date", "status"]),
    "Ticket":        (8.5, 3.0, ["id (PK)", "tenant_id (FK)", "raised_by", "category", "status"]),
    "Document":      (0.5, 0.2, ["id (PK)", "owner_id (FK)", "url", "type", "uploaded_at"]),
    "CalendarEvent": (4.5, 0.2, ["id (PK)", "tenant_id (FK)", "title", "start", "end", "attendees"]),
    "AuditLog":      (8.5, 0.2, ["id (PK)", "tenant_id (FK)", "actor_id", "action", "timestamp"]),
}
positions = {}
for name, (x, y, fields) in entities.items():
    h = 0.45 + 0.32 * len(fields)
    box = FancyBboxPatch((x, y), 3.0, h, boxstyle="round,pad=0.02,rounding_size=0.04",
                         linewidth=1.5, edgecolor=PRIMARY, facecolor="#FFFFFF")
    ax.add_patch(box)
    ax.text(x + 1.5, y + h - 0.25, name, ha='center', fontsize=11, fontweight='bold', color=PRIMARY)
    for i, f in enumerate(fields):
        ax.text(x + 0.15, y + h - 0.6 - i * 0.3, "• " + f, fontsize=9, color=DARK)
    positions[name] = (x + 1.5, y, x + 1.5, y + h)

def link(a, b):
    ax_, ay1, _, ay2 = positions[a]
    bx_, by1, _, by2 = positions[b]
    if ay1 < by1:
        arrow(ax, ax_, ay2, bx_, by1, color=GRAY, style='-', lw=1.0)
    else:
        arrow(ax, ax_, ay1, bx_, by2, color=GRAY, style='-', lw=1.0)

link("Tenant", "User")
link("User", "Employee")
link("Employee", "Timesheet")
link("Employee", "LeaveRequest")
link("Tenant", "Ticket")
link("Employee", "Document")
link("Tenant", "CalendarEvent")
link("Tenant", "AuditLog")

plt.tight_layout()
plt.savefig(f"{OUT}/erd.png", dpi=160, bbox_inches='tight', facecolor='white')
plt.close()
print("erd.png")

# 5. MODULE MAP
fig, ax = plt.subplots(figsize=(12, 7))
ax.set_xlim(0, 12); ax.set_ylim(0, 7); ax.axis('off')
ax.set_title("Figure 5 — HRMS Module Map for Perfect Solutions",
             fontsize=14, fontweight='bold', color=PRIMARY, pad=12)

# central
styled_box(ax, 4.5, 3.0, 3.0, 1.2, "AurborBloom HRMS\nfor Perfect Solutions", fill=PRIMARY, fontcolor='#FFFFFF', fontsize=12)

modules = [
    (0.3, 5.5, "Employee\nDirectory"),
    (3.0, 5.8, "Time &\nAttendance"),
    (6.0, 5.8, "Leave\nManagement"),
    (9.0, 5.5, "Tickets &\nHelpdesk"),
    (0.3, 0.5, "Calendar &\nScheduling"),
    (3.0, 0.3, "Projects &\nTasks"),
    (6.0, 0.3, "Documents\nVault"),
    (9.0, 0.5, "Performance\nReviews"),
]
for x, y, lbl in modules:
    styled_box(ax, x, y, 2.6, 1.0, lbl, fill=ACCENT, fontsize=10)
    cx, cy = x + 1.3, y + 0.5
    arrow(ax, 6.0, 3.6, cx, cy, color=SECONDARY, style='-')

plt.tight_layout()
plt.savefig(f"{OUT}/modules.png", dpi=160, bbox_inches='tight', facecolor='white')
plt.close()
print("modules.png")

print("All diagrams generated.")
