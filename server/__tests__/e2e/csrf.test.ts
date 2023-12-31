import fetch from 'node-fetch';
import { fetchCsrf, CSRFRequest, getMarketplaceURL } from '../utils';

describe('CSRF protection', () => {
  it('provides a CSRF token on the GET endpoint and sets the hash cookie', async () => {
    const { cookie, token } = await fetchCsrf();
    expect(cookie).toMatch(/x-csrf-token=/);
    expect(token.length).toBeGreaterThan(0);
  });

  it('protects an POST endpoint which does not include a CSRF token', async () => {
    const resp = await fetch(`${getMarketplaceURL()}/csrfToken`, {
      method: 'POST',
    });
    expect(resp.status).toBe(403);
  });

  it('allows requests that use the double CSRF pattern', async () => {
    const req = await CSRFRequest(`${getMarketplaceURL()}/csrfToken`, 'GET');
    const resp = await fetch(req);
    expect(resp.status).toBe(200);
  });
});
