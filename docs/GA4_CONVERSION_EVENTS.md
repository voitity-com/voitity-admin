# GA4 conversion events

The admin continues the campaign session started on `bigmelo.com` and emits
conversion events only after the corresponding user or API action.

| Event | Emission point |
| --- | --- |
| `signup_started` | First interaction with the email sign-up form or Google sign-up button |
| `sign_up` | Account creation succeeds |
| `email_verified` | The verification link returns with `verification=verified` |
| `begin_checkout` | A plan checkout dialog opens, including campaign checkout intent |
| `add_payment_info` | The API accepts the selected or newly tokenized payment source |
| `trial_started` | The trial API call succeeds |
| `trial_cancelled` | Trial cancellation succeeds |
| `purchase` | A non-trial subscription payment is returned as approved |
| `profile_created` | Profile creation succeeds |
| `profile_published` | Profile activation succeeds |

UTM attribution, the landing variant, and supported advertising click IDs are
kept in the checkout intent across sign-up and sign-in. Only the five UTM
fields are sent to the Bigmelo trial API because those are the fields accepted
and stored by the activation report. Click IDs remain in the browser journey
for GA attribution.

No email, name, alias, phone, card number, token, chat content, or profile ID is
sent to Google Analytics. Payment and billing routes do not emit `page_view`
events, and payment events contain only plan, cycle, price, currency, payment
method category, trial days, and a transaction identifier when available. A
free trial reports `value=0`; `plan_value` contains the future plan price for
analysis without treating the trial as collected revenue.
