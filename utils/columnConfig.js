import { MaterialIcons } from '@expo/vector-icons';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

const yesNo = (v) => (v ? 'Yes' : 'No');

export const getFinalStatus = (r) => {
  // direct manager status lives in r.status
  const main = r.status?.toUpperCase();

  // stitch all stages together
  const chain = [
    r.status,
    r.hr_status,
    r.finance_coordinator_status,
    r.finance_status,
    r.ceo_status,
  ].filter((v) => v != null);

  const all = chain.map((v) => v.toUpperCase());

  if (all.length === 0) return 'PENDING';
  if (all.some((v) => v === 'REJECTED')) return 'REJECTED';
  if (all.every((v) => v === 'APPROVED')) return 'APPROVED';
  return main || 'PENDING';
};

const managerSt = (r) => r.status?.toUpperCase() ?? 'PENDING';
const hrSt = (r) => r.hr_status?.toUpperCase() ?? 'PENDING';
const coordSt = (r) => r.finance_coordinator_status?.toUpperCase() ?? 'PENDING';
const finSt = (r) => r.finance_status?.toUpperCase() ?? 'PENDING';
const ceoSt = (r) => r.ceo_status?.toUpperCase() ?? 'PENDING';
const hasFile = (r) => (r.attachment_path || r.attachments?.length) ? 'Yes' : 'No';

// Status colors for consistent styling
export const STATUS_COLORS = {
  PENDING: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  default: '#64748B',
};

// Icons for different request types
const REQUEST_ICONS = {
  to_leave: 'flight-takeoff',
  loans: 'attach-money',
  finance_claim: 'receipt',
  misc: 'category',
  business_trip: 'business-center',
  bank: 'account-balance',
  personal_data_change: 'person',
  default: 'description',
};

export function getIconForTab(tab) {
  return REQUEST_ICONS[tab] || REQUEST_ICONS.default;
}

export function getColumnsForTab(tab) {
  const base = [
    {
      label: 'Created',
      accessor: (r) => fmtDate(r.created_at || r.request_date),
      icon: 'event',
    },
    {
      label: 'Attachment',
      accessor: hasFile,
      icon: 'attachment',
    },
  ];

  const cols = (...extra) => [...base, ...extra];

  switch (tab) {
    case 'to_leave':
      return cols(
        {
          label: 'From',
          accessor: (r) => fmtDate(r.from_date),
          icon: 'event-available',
        },
        {
          label: 'To',
          accessor: (r) => fmtDate(r.to_date),
          icon: 'event-busy',
        },
        {
          label: 'Leave Type',
          accessor: (r) => r.leave_type ?? 'N/A',
          icon: 'beach-access',
        },
        {
          label: 'Manager',
          accessor: managerSt,
          status: true,
          icon: 'supervisor-account',
        },
        {
          label: 'HR',
          accessor: hrSt,
          status: true,
          icon: 'work',
        },
      );

    case 'loans':
      return cols(
        {
          label: 'Loan Date',
          accessor: (r) => fmtDate(r.loan_date),
          icon: 'event',
        },
        {
          label: 'Payments',
          accessor: (r) => r.no_of_payments ?? 'N/A',
          icon: 'repeat',
        },
        {
          label: 'Amount',
          accessor: (r) => r.amount ? `SAR ${r.amount}` : 'N/A',
          icon: 'monetization-on',
        },
        {
          label: 'HR',
          accessor: hrSt,
          status: true,
          icon: 'work',
        },
        {
          label: 'Finance',
          accessor: finSt,
          status: true,
          icon: 'account-balance',
        },
        {
          label: 'CEO',
          accessor: ceoSt,
          status: true,
          icon: 'person',
        },
      );

    case 'finance_claim':
      return cols(
        {
          label: 'Description',
          accessor: (r) => r.description ?? 'N/A',
          icon: 'description',
        },
        {
          label: 'Total',
          accessor: (r) => r.amount ? `SAR ${r.amount}` : 'N/A',
          icon: 'payments',
        },
        {
          label: 'HR',
          accessor: hrSt,
          status: true,
          icon: 'work',
        },
        {
          label: 'Coordinator',
          accessor: coordSt,
          status: true,
          icon: 'people',
        },
        {
          label: 'Finance',
          accessor: finSt,
          status: true,
          icon: 'account-balance',
        },
      );

    case 'misc':
      return cols(
        {
          label: 'Item',
          accessor: (r) => r.requested_item ?? 'N/A',
          icon: 'inventory',
        },
        {
          label: 'Temporary?',
          accessor: (r) => yesNo(r.is_temporary),
          icon: 'hourglass-bottom',
        },
        {
          label: 'Manager',
          accessor: managerSt,
          status: true,
          icon: 'supervisor-account',
        },
        {
          label: 'HR',
          accessor: hrSt,
          status: true,
          icon: 'work',
        },
      );

    case 'business_trip':
      return cols(
        {
          label: 'Region',
          accessor: (r) => r.business_trip_region ?? 'N/A',
          icon: 'location-on',
        },
        {
          label: 'Purpose',
          accessor: (r) => r.description ?? 'N/A',
          icon: 'work',
        },
        {
          label: 'Manager',
          accessor: managerSt,
          status: true,
          icon: 'supervisor-account',
        },
        {
          label: 'HR',
          accessor: hrSt,
          status: true,
          icon: 'work',
        },
      );

    case 'bank':
      return cols(
        {
          label: 'Bank',
          accessor: (r) => r.bank_name ?? 'N/A',
          icon: 'account-balance',
        },
        {
          label: 'Branch',
          accessor: (r) => r.bank_branch ?? 'N/A',
          icon: 'location-on',
        },
        {
          label: 'Account #',
          accessor: (r) => r.new_account_number ?? 'N/A',
          icon: 'credit-card',
        },
        {
          label: 'HR',
          accessor: hrSt,
          status: true,
          icon: 'work',
        },
      );

    case 'personal_data_change':
      return cols(
        {
          label: 'Field',
          accessor: (r) => r.personal_data_field ?? 'N/A',
          icon: 'tune',
        },
        {
          label: 'New Value',
          accessor: (r) => r.personal_data_value ?? 'N/A',
          icon: 'edit',
        },
        {
          label: 'Manager',
          accessor: managerSt,
          status: true,
          icon: 'supervisor-account',
        },
        {
          label: 'HR',
          accessor: hrSt,
          status: true,
          icon: 'work',
        },
      );

    default:
      return cols(
        {
          label: 'Request Type',
          accessor: (r) => r.request_type,
          icon: 'description',
        },
        {
          label: 'Manager',
          accessor: managerSt,
          status: true,
          icon: 'supervisor-account',
        },
        {
          label: 'HR',
          accessor: hrSt,
          status: true,
          icon: 'work',
        },
      );
  }
}
