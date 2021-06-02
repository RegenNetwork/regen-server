import { withRootDb, reallyCreateOrganizationIfNeeded, createUser } from '../helpers';

const walletAddr: string = 'addr123';
const legalName = 'acme inc';
const displayName = 'Acme';
const image: string = 'image';
const description: string = 'description for acme';
const roles = null;
const orgAddress: object = { 'some': 'address' };

const userEmail: string = 'test@user'
const userName: string = 'orgUserName'
const userImage: string = 'orgUserImage'

// TODO: This is a strange error, might have to do with default params, but we
// likley don't need the `if_needed` version
xit('creates org if needed successfully', () =>
  withRootDb(async (client) => {
    // Action
    const user = await createUser(client, userEmail, userName, userImage, null, null)
    const org = await reallyCreateOrganizationIfNeeded(
      client,
      legalName,
      displayName,
      walletAddr,
      user.id,
      image,
      description,
      roles,
      orgAddress
    );

    // Assertions
    expect(org).not.toBeNull();
    expect(org.party_id).not.toBeNull();
    expect(org.legal_name).toEqual(legalName);

    const { rows: orgParties } = await client.query(
      'select * from party where id=$1',
      [org.party_id]
    );

    expect(orgParties).toHaveLength(1);
    const orgParty = orgParties[0];

    expect(orgParty.name).toEqual(displayName);
    expect(orgParty.description.trim()).toEqual(description);
    expect(orgParty.image).toEqual(image);
    expect(orgParty.type).toEqual('organization');
    expect(orgParty.wallet_id).not.toBeNull();
    expect(orgParty.address_id).not.toBeNull();

    const { rows: orgMembers } = await client.query(
      'select * from organization_member where organization_id=$1',
      [org.id]
    );

    expect(orgMembers).toHaveLength(1);
    expect(orgMembers[0].is_owner).toEqual(true);

    const { rows: users } = await client.query(
      'select * from "user" where id=$1',
      [orgMembers[0].member_id]
    );

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual(userEmail);
  })
);
