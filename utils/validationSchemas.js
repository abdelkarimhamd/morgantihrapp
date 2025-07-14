import * as Yup from 'yup';

/** ========== LEAVE REQUEST ========== */
export const leaveRequestSchema = Yup.object().shape({
  leaveType: Yup.string().required('Leave type is required'),
  fromDate: Yup.date().required('From date is required'),
  fromTime: Yup.string().optional(), // if you store time as a string
  toDate: Yup.date()
    .required('To date is required')
    .min(Yup.ref('fromDate'), 'To date can’t be before the From date'),
  toTime: Yup.string().optional(), // if you store time as a string
  reason: Yup.string().required('Reason is required'),
  attachment: Yup.mixed().optional(),
});

/** ========== FINANCE CLAIM ========== */
export const financeClaimSchema = Yup.object().shape({
  claimSubmissionDate: Yup.date().required('Claim submission date is required'),
  financeClaims: Yup.array()
    .of(
      Yup.object().shape({
        transaction_date: Yup.date().required('Transaction date is required'),
        expense_type: Yup.string().required('Expense type is required'),
        amount: Yup.number()
          .required('Amount is required')
          .positive('Amount must be positive'),
        notes: Yup.string().optional(),
        attachment: Yup.mixed().optional(),
      })
    )
    .min(1, 'At least one finance claim item is required'),
});

/** ========== RESIGNATION ========== */
export const resignationSchema = Yup.object().shape({
  resignation_date: Yup.date().required('Resignation date is required'),
  last_working_day: Yup.date()
    .required('Last working day is required')
    .min(
      Yup.ref('resignation_date'),
      'Last working day must be on or after the resignation date'
    ),
  notice_period: Yup.number()
    .required('Notice period is required')
    .positive('Notice period must be a positive number'),
  resignation_reason: Yup.string().required('Reason for resignation is required'),
  attachment: Yup.mixed().optional(),
});

/** ========== LOAN REQUEST ========== */
export const loanRequestSchema = Yup.object().shape({
  loanDate: Yup.date().required('Loan date is required'),
  noOfPayments: Yup.number()
    .required('Number of payments is required')
    .positive('Must be a positive number'),
  loanAmount: Yup.number()
    .required('Loan amount is required')
    .positive('Loan amount must be a positive number'),
  loanReason: Yup.string().required('Reason for loan is required'),
  attachment: Yup.mixed().optional(),
});

/** ========== MISC REQUEST ========== */
export const miscRequestSchema = Yup.object().shape({
  // If isTemporary is a boolean that controls whether from/to fields are required,
  // you can add .when() logic. For now, we assume they are always required:
  miscFromDate: Yup.date().required('From date is required'),
  miscFromTime: Yup.string().required('From time is required'),
  miscToDate: Yup.date()
    .required('To date is required')
    .min(Yup.ref('miscFromDate'), 'To date can’t be before From date'),
  miscToTime: Yup.string().required('To time is required'),
  miscReason: Yup.string().required('Reason for request is required'),
  miscNotes: Yup.string().optional(),
  attachment: Yup.mixed().optional(),
});

/** 
 * If you want a single, combined schema, you can embed each
 * sub-schema for the relevant portion of the form. 
 * This approach is helpful if your state looks like:
 * {
 *   request_type: 'to_leave',
 *   leaveRequest: { ... },
 *   financeClaim: { ... },
 *   ...
 * } 
 */
export const hrRequestFormSchema = Yup.object().shape({
  leaveRequest: leaveRequestSchema.optional(),
  financeClaim: financeClaimSchema.optional(),
  resignation: resignationSchema.optional(),
  loanRequest: loanRequestSchema.optional(),
  miscRequest: miscRequestSchema.optional(),
});

/**
 * An object containing all schemas,
 * for direct import if you validate by request type.
 */
export const validationSchemas = {
  leaveRequest: leaveRequestSchema,
  financeClaim: financeClaimSchema,
  resignation: resignationSchema,
  loanRequest: loanRequestSchema,
  miscRequest: miscRequestSchema,
};
