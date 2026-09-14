# Defensive detection of automation disguise

This document is a teaching and defensive reference. Evolution API deliberately does not include an engine that introduces spelling errors, homoglyphs, or other mutations to make automation look human. Connecting such an engine to a sender would enable platform-evasion behavior and can corrupt names, legal text, codes, and accessibility output.

## What disguise attempts look like

Static examples (not generator rules):

| Signal | Benign template | Suspicious variant | Defensive observation |
|---|---|---|---|
| Near-key typo | `Your appointment is confirmed` | `Your appoinfment is confirmed` | Small edit distance repeated at statistically regular rates across recipients. |
| Homoglyph | `Payment reference ABC123` | `Pаyment reference ABC123` | The second form can contain a visually similar non-Latin character; normalize Unicode scripts before comparison. |
| Artificial corrections | One clean send | Rapid send, delete/edit, resend | Repeated edit timing and identical semantic payload reveal scripted correction cycles. |
| Cadence randomization | Stable queue pacing | Random delays inside a narrow synthetic distribution | Aggregate inter-send intervals by instance and compare against true conversation-triggered traffic. |

## Defensive controls

1. Preserve canonical outbound text and sign or hash approved templates. Alert when the sent text differs.
2. Normalize Unicode (NFKC), detect mixed scripts and confusables, then compare normalized template fingerprints.
3. Compare both character edit distance and token/semantic similarity. Typos often defeat exact matching but not combined similarity.
4. Correlate sends with relationship state. High unique-recipient outreach without recent inbound contact is more informative than spelling alone.
5. Separate reply capacity from cold outreach. The `outreach` policy does this using persistent inbound timestamps.
6. Monitor edit/delete/resend sequences, presence events, identical URL destinations, and repeated campaign-sized recipient cohorts.
7. Keep message content immutable in middleware. Apply backpressure, quiet hours, suppression, and transparent audit fields instead of disguise.

Detection should be risk-scored, not treated as proof: multilingual writers, assistive input, dyslexia, mobile keyboards, and second-language use can all produce natural variation. Use review thresholds and appeal paths rather than automatically penalizing a single typo.
