import { Pool, PoolClient } from 'pg';
require('dotenv').config();

const pools = {};

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Cannot run tests without a TEST_DATABASE_URL');
}
const TEST_DATABASE_URL: string = process.env.TEST_DATABASE_URL;

beforeAll(() => {
  // TODO
});

// Make sure we release those pgPools so that our tests exit!
afterAll(() => {
  const keys = Object.keys(pools);
  return Promise.all(
    keys.map(async (key) => {
      try {
        const pool = pools[key];
        delete pools[key];
        await pool.end();
      } catch (e) {
        console.error('Failed to release connection!');
        console.error(e);
      }
    })
  );
});

export const poolFromUrl = (url: string) => {
  if (!pools[url]) {
    pools[url] = new Pool({ connectionString: url });
  }
  return pools[url];
};

type ClientCallback<T = any> = (client: PoolClient) => Promise<T>;

const withDbFromUrl = async <T>(url: string, fn: ClientCallback<T>) => {
  const pool = poolFromUrl(url);
  const client = await pool.connect();
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE;');

  try {
    await fn(client);
  } catch (e) {
    // Error logging can be helpful:
    if (typeof e.code === 'string' && e.code.match(/^[0-9A-Z]{5}$/)) {
      console.error([e.message, e.code, e.detail, e.hint, e.where].join('\n'));
    }
    throw e;
  } finally {
    await client.query('ROLLBACK;');
    await client.query('RESET ALL;'); // Shouldn't be necessary, but just in case...
    await client.release();
  }
};

export const withRootDb = <T>(fn: ClientCallback<T>) =>
  withDbFromUrl(TEST_DATABASE_URL, fn);

export const becomeRoot = (client: PoolClient) => client.query(`set role "${process.env.TEST_DATABASE_USER}"`);

export const becomeUser = async (
  client: PoolClient,
  userSub: string,
) => {
  await becomeRoot(client);
  await client.query(
    `set role "${userSub}"`
  );
};

export type Party = {
  wallet_id: string;
  id: string;
};

export type User = {
  auth0_sub: string;
  id: string;
};

export const withAdminUserDb = <T>(
  fn: (client: PoolClient, user: User, party: Party) => Promise<T>
) =>
  withRootDb(async (client) => {
    const sub: string = 'test-admin-sub';
    const email: string = 'johndoe@regen.network';
    const name: string = 'john doe';
    const organization = await createUserOrganisation(client, email, name, '', 'RND test', 'walletAddr', null, { 'some': 'address' });
    const { rows: [party] } = await client.query(
      'select * from party where id=$1',
      [organization.party_id]
    );
    await client.query('SELECT private.create_app_user_if_needed($1)', [sub]);
    await client.query('INSERT INTO admin (auth0_sub) VALUES ($1)', [sub]);

    const user = await createUser(client, email, name, '', sub, null);
    await becomeUser(client, sub);
    await fn(client, user, party);
  });

export async function createUser(
  client: PoolClient,
  email: string | null,
  name: string | null,
  image: string | null,
  sub: string | null,
  roles: string[] | null,
) {
  const {
    rows: [row],
  } = await client.query(
    `
      select * from private.really_create_user_if_needed(
        $1,
        $2,
        $3,
        $4,
        $5
      )
      `,
    [email, name, image, sub, roles]
  );
  return row;
}

export async function createUserOrganisation(
  client: PoolClient,
  email: string | null,
  name: string | null,
  image: string | null,
  orgName: string | null,
  walletAddr: string | null,
  roles: string[] | null,
  orgAddress: object | null,
) {
  const {
    rows: [row],
  } = await client.query(
    `
      select * from public.create_user_organization(
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      `,
    [email, name, image, orgName, walletAddr, roles, orgAddress]
  );
  return row;
}

export async function createProject(
  client: PoolClient,
  name: string,
  issuerWalletId: string | null,
) {
  const methodologyDeveloper = await createUserOrganisation(client, 'methodology@test.com', 'methodology dev user', '', 'methodology dev org', 'methodology wallet address', null, { 'some': 'address' });
  const projectDeveloper = await createUserOrganisation(client, 'project@test.com', 'project dev user', '', 'project dev org', 'project wallet address', null, { 'some': 'address' });
  const landSteward = await createUserOrganisation(client, 'steward@test.com', 'steward user', '', 'steward org', 'steward wallet address', null, { 'some': 'address' });
  const {
    rows: [row],
  } = await client.query(
    `
      select * from private.really_create_project(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      `,
    [
      methodologyDeveloper.party_id,
      projectDeveloper.party_id,
      landSteward.party_id,
      name,
      new Date(),
      new Date(),
      new Date(),
      'summary description',
      'long description',
      'image',
      100,
      'hectares',
      'active',
    ]
  );

  if (issuerWalletId) {
    await client.query(
      `
        insert into credit_class_issuer (credit_class_id, issuer_id) values ($1, $2)
        `,
      [row.credit_class_id, issuerWalletId],
    );
  }
  return row;
}

export async function reallyCreateOrganization(
  client: PoolClient,
  legalName: string,
  displayName: string,
  walletAddr: string,
  ownerId: string,
  image: string,
  description: string | null,
  roles: string[] | null,
  orgAddress: object | null,
) {
  const {
    rows: [row],
  } = await client.query(
    `
      select * from public.really_create_organization(
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
    `,
    [legalName, displayName, walletAddr, ownerId, image, description, roles, orgAddress]
  );
  return row;
}