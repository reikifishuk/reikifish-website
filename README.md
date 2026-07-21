# reikifish-website
Official website of Andy Fish - Author, Mindset Coach and Reiki Practitioner

## Contact Form Email Delivery

The contact form now posts to the serverless API route at `/api/contact`, which sends enquiries through Resend instead of `mailto:`.

Required environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (recommended, and must be a verified Resend sender for production)

The destination inbox is handled server-side and is not exposed in the frontend.
