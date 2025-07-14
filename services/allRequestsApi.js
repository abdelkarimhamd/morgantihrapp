import api from './api';

/* ──────────────────────────────────────────────────────────────────
   1) GET /hr-requests
────────────────────────────────────────────────────────────────── */
export async function fetchHrRequests(params) {
  const { view_mode, request_type, from_date, to_date } = params;
  const res = await api.get('/hr-requests', { params });
  return res.data;
}

/* ──────────────────────────────────────────────────────────────────
   2) POST /hr-requests
────────────────────────────────────────────────────────────────── */
export const createHrRequest = async (formValues) => {
  const fd = new FormData();
  fd.append('request_type', formValues.request_type);

  /* optional common fields */
  ['request_date', 'priority', 'due_date', 'notes'].forEach((k) => {
    if (formValues[k]) fd.append(k, formValues[k]);
  });

  /* ---------- to_leave ---------- */
  if (formValues.request_type === 'to_leave') {
    fd.append('leave_type',   formValues.leaveType  || '');
    fd.append('from_date',    formValues.fromDate   || '');
    fd.append('from_time',    formValues.fromTime   || '');
    fd.append('to_date',      formValues.toDate     || '');
    fd.append('to_time',      formValues.toTime     || '');
    fd.append('description',  formValues.reason     || '');
  }

  /* ---------- loans ---------- */
  else if (formValues.request_type === 'loans') {
    fd.append('loan_date',      formValues.loanDate      || '');
    fd.append('no_of_payments', formValues.noOfPayments  || '');
    fd.append('amount',         formValues.loanAmount    || '');
    fd.append('description',    formValues.loanReason    || '');
  }

  /* ---------- personal-data change  (FIXED) ---------- */
  else if (formValues.request_type === 'personal_data_change') {
    fd.append('personal_data_field',  formValues.personalDataField  || '');
    fd.append('personal_data_value',  formValues.personalDataValue  || '');
    fd.append('description',          formValues.description        || '');
    // attachment is optional – handle later with the common section
  }

  /* ---------- finance_claim ---------- */
  else if (formValues.request_type === 'finance_claim') {
    const { financeClaims = [] } = formValues;
    financeClaims.forEach((item, i) => {
      fd.append(`financeClaims[${i}][transaction_date]`, item.transaction_date || '');
      fd.append(`financeClaims[${i}][expense_type]`,     item.expense_type     || '');
      fd.append(`financeClaims[${i}][amount]`,           item.amount           || '');
      fd.append(`financeClaims[${i}][notes]`,            item.notes            || '');
      if (item.attachment) {
        fd.append(`financeClaims[${i}][attachment]`, item.attachment);
      }
    });
  }

  /* ---------- misc ---------- */
  else if (formValues.request_type === 'misc') {
    fd.append('requested_item', formValues.requestedItem || '');
    fd.append('is_temporary',   formValues.isTemporary ? '1' : '0');
    if (formValues.isTemporary) {
      fd.append('miscFromDate', formValues.miscFromDate || '');
      fd.append('miscFromTime', formValues.miscFromTime || '');
      fd.append('miscToDate',   formValues.miscToDate   || '');
      fd.append('miscToTime',   formValues.miscToTime   || '');
    }
    fd.append('miscReason', formValues.miscReason || '');
    fd.append('miscNotes',  formValues.miscNotes  || '');
  }

  /* ---------- business_trip ---------- */
  else if (formValues.request_type === 'business_trip') {
    fd.append('business_trip_region', formValues.busTripRegion || '');
    fd.append('description',          formValues.busTripReason || '');
    fd.append('notes',                formValues.busTripNotes  || '');
    fd.append('from_date',            formValues.fromDate      || '');
    fd.append('to_date',              formValues.toDate        || '');
    fd.append('from_time',            formValues.fromTime      || '');
    fd.append('to_time',              formValues.toTime        || '');
    (formValues.businessTripAttachments || []).forEach((f, i) =>
      fd.append(`attachments[${i}]`, f),
    );
  }

  /* ---------- bank ---------- */
  else if (formValues.request_type === 'bank') {
    fd.append('bank_transaction_date', formValues.bankTransactionDate || '');
    fd.append('bank_name',             formValues.bankName           || '');
    fd.append('bank_branch',           formValues.bankBranch         || '');
    fd.append('new_account_number',    formValues.newAccountNumber   || '');
    fd.append('new_iban_number',       formValues.newIbanNumber      || '');
    fd.append('swift_code',            formValues.swiftCode          || '');
    fd.append('bank_notes',            formValues.bankNotes          || '');
  }

  /* ---------- resignation ---------- */
  else if (formValues.request_type === 'resignation') {
    fd.append('resignation_date',  formValues.resignation_date  || '');
    fd.append('last_working_day',  formValues.last_working_day  || '');
    fd.append('notice_period',     formValues.notice_period     || '');
    fd.append('resignation_reason',formValues.resignation_reason|| '');
  }

  /* optional single attachment */
  if (formValues.attachment) {
    fd.append('attachment', formValues.attachment);
  }

  const res = await api.post('/hr-requests', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

/* ──────────────────────────────────────────────────────────────────
   3) GET /hr-requests/:id
────────────────────────────────────────────────────────────────── */
export const showHrRequest = async (id) => (await api.get(`/hr-requests/${id}`)).data;

/* ──────────────────────────────────────────────────────────────────
   4) PUT /hr-requests/:id
────────────────────────────────────────────────────────────────── */
export async function updateRequestStatus(id, status) {
  return (await api.put(`/hr-requests/${id}/status`, { status })).data;
}

export const updateHrRequest = async (id, formValues) => {
  const fd = new FormData();
  [
    'status',
    'description',
    'amount',
    'item_name',
    'personal_data_field',
    'personal_data_value',   // NEW
    'transaction_date',
    'loan_period',
    'request_date',
    'priority',
    'due_date',
    'notes',
  ].forEach((k) => {
    if (formValues[k]) fd.append(k, formValues[k]);
  });
  if (formValues.attachment) fd.append('attachment', formValues.attachment);

  return (
    await api.put(`/hr-requests/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data;
};

/* ──────────────────────────────────────────────────────────────────
   5) DELETE /hr-requests/:id
────────────────────────────────────────────────────────────────── */
export const deleteHrRequest = async (id) =>
  (await api.delete(`/hr-requests/${id}`)).data;
