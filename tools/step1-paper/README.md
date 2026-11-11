# Step 1 on paper

`hiring-forms/step1-paper-packet.pdf` is the Step 1 forms, blank, to print and mail.
It is built from the server's approved wording (Staffing-Coordinator-Hub `supabase/functions/_shared/step1-documents.ts`),
so the words match what applicants sign on their phone. Only the phone-only phrases in `swaps.json` change on paper.

To rebuild after a Step 1 wording change: copy `step1-documents.ts`, `brand-pdf.ts`, `brand-assets.ts`,
`offer-documents.ts`, `hepb-appendix-a.ts` and `positions.ts` from that folder next to `paper.ts`, then

    SWAPS="$(cat swaps.json)" node paper.ts ../../hiring-forms/step1-paper-packet.pdf

and bump the `?v=` on the two links (forms.html, index.html). Only forms in APPROVED_FOR_REAL at their current version are printed.
