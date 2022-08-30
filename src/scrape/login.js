const { GOOGLE_EMAIL, GOOGLE_PASSWORD } = process.env;

export default async page => {
  const email = page.locator('input[type=email]');
  const password = page.locator('input[type=password]');
  const next = page.locator('button', { hasText: 'Next' });

  await email.fill(GOOGLE_EMAIL);
  await next.click();

  await password.fill(GOOGLE_PASSWORD);
  await next.click();

  const heading = page.locator('h1, h2, strong >> nth=0');
  await heading.waitFor();
};
