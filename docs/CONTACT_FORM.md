# Contact form

Published on September 12, 2026, revision `chatpm-00104-jmk`.

The homepage contact section includes exactly three required visible fields: name, email address, and message. All contact links in published pages target that section. FormSubmit delivers to `aditya@decisionos.me`, confirmed by the owner. Reply-To uses the visitor's email. Default provider CAPTCHA and a hidden honeypot are enabled. Success redirects to the noindex `/thanks.html` page.

Build, public routes, form field requirements, destination, redirect, and desktop/mobile layouts checked. An empty submission was blocked by native browser validation. One setup-test submission was sent from the public form; FormSubmit displayed “Check Your Email” and confirmed it sent an activation link. Owner activation and a post-activation delivery check remain pending.

Cloud Build: `889077cb-6e9c-4e3a-95f5-83217206764a`.
