from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"


class CorrectionStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AnnouncementPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ProjectStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class BreakStatus(str, Enum):
    ON_BREAK = "ON_BREAK"
    WORKING = "WORKING"


class ChannelType(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class NotificationType(str, Enum):
    LEAVE_REQUEST = "LEAVE_REQUEST"
    LEAVE_APPROVED = "LEAVE_APPROVED"
    LEAVE_REJECTED = "LEAVE_REJECTED"
    TIMESHEET_APPROVED = "TIMESHEET_APPROVED"
    ANNOUNCEMENT = "ANNOUNCEMENT"
    TICKET_CREATED = "TICKET_CREATED"
    TICKET_UPDATED = "TICKET_UPDATED"
    TICKET_COMMENT = "TICKET_COMMENT"


class TicketCategory(str, Enum):
    IT_SUPPORT = "IT_SUPPORT"
    HR = "HR"
    PAYROLL = "PAYROLL"
    FACILITIES = "FACILITIES"
    TIME_ATTENDANCE = "TIME_ATTENDANCE"
    BENEFITS = "BENEFITS"
    OTHER = "OTHER"


class TicketPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_ON_USER = "WAITING_ON_USER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
