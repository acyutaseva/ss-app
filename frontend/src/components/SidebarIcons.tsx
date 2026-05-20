// Simple icon components for sidebar nav
export const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none" {...props}>
    <rect x="3" y="3" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="11" y="3" width="6" height="4" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="3" y="11" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9" y="11" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const AttendanceIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none" {...props}>
    <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 17c0-2.7614 3.134-5 7-5s7 2.2386 7 5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const StudentsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none" {...props}>
    <circle cx="7" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="15" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 17c0-2.2091 2.6863-4 6-4s6 1.7909 6 4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 17c0-1.1046 1.7909-2 4-2s4 .8954 4 2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const VolunteersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none" {...props}>
    <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 17c0-2.7614 3.134-5 7-5s7 2.2386 7 5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 10v7" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const EventsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none" {...props}>
    <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 9h14" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 1v4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M13 1v4" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const ReportsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none" {...props}>
    <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const AuditLogsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none" {...props}>
    <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="10" cy="10" r="2" fill="currentColor"/>
  </svg>
);
