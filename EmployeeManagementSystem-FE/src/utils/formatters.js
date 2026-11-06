export const currency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
export const prettify = (value) => String(value ?? "—").replaceAll("_", " ");
export const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const dateTimeLabel = (value) => value ? new Date(value).toLocaleString("en-US", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
}) : "—";
export const localDateKey = (value = new Date()) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const dateTimeInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function initials(name = "") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "PP"; }

export function payslipMarkup(payslip) {
  const safe = (value) => String(value ?? "—").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payslip · ${safe(payslip.employee_name)}</title><style>
    body{font-family:Arial,sans-serif;color:#172033;max-width:680px;margin:48px auto;padding:24px}
    h1{font-size:24px;margin:0}p{color:#697386;font-size:13px}.top{display:flex;justify-content:space-between;border-bottom:1px solid #e7eaf0;padding-bottom:22px}
    table{width:100%;border-collapse:collapse;margin-top:30px;font-size:14px}td{padding:14px 8px;border-bottom:1px solid #edf0f5}td:last-child{text-align:right;font-weight:bold}
    .total td{font-size:17px;font-weight:bold;color:#6258e8}.print{margin-top:24px;padding:10px 16px;border:0;border-radius:8px;background:#6258e8;color:white;font-weight:bold;cursor:pointer}
    @media print{body{margin:0}.print{display:none}}
  </style></head><body><div class="top"><div><h1>PAYSLIP</h1><p>${safe(payslip.employee_name)} · ${safe(payslip.employee_code)}</p><p>${safe(payslip.department)}${payslip.designation ? ` · ${safe(payslip.designation)}` : ""}</p></div><div><p>Pay period</p><strong>${safe(dateLabel(payslip.pay_period))}</strong><p>Status: ${safe(payslip.status)}</p></div></div><table>
    <tr><td>Gross salary</td><td>${safe(currency(payslip.gross_salary))}</td></tr><tr><td>Deductions</td><td>− ${safe(currency(payslip.deductions))}</td></tr><tr class="total"><td>Net pay</td><td>${safe(currency(payslip.net_salary))}</td></tr><tr><td>Payment date</td><td>${safe(dateLabel(payslip.payment_date))}</td></tr>
  </table><button class="print" onclick="window.print()">Print payslip</button></body></html>`;
}
