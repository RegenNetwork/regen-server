import { Client } from 'pg';
import { MetadataGraph } from '../metadata_graph';

describe('MetadataGraph', () => {
  const dburl = process.env.TEST_DATABASE_URL;
  const client = new Client({
    connectionString: dburl,
  });
  const metadataGraph = new MetadataGraph(client);

  beforeAll(async () => {
    return await client.connect();
  });
  beforeEach(async () => {
    return await client.query('BEGIN');
  });
  afterEach(async () => {
    return await client.query('ROLLBACK');
  });
  afterAll(async () => {
    return await client.end();
  });

  test('inserts a doc', async () => {
    const doc = {
      'http://schema.org/name': 'Bucky Fuller',
      'http://schema.org/url': {
        '@id': 'http://www.wikidata.org/wiki/Q102289/',
      },
    };
    const { iri, metadata } = await metadataGraph.insertDoc(doc);
    expect(iri).toBe(
      'regen:13toVhNei4y1Tt2Ebf2ZkCM1vQ3hcudK4miVKpaqgkc1mmaETcC3jjQ.rdf',
    );
    expect(metadata).toMatchObject(doc);
  });
  test('inserting the same doc works idempotently', async () => {
    const doc = {
      'http://schema.org/name': 'Bucky Fuller',
      'http://schema.org/url': {
        '@id': 'http://www.wikidata.org/wiki/Q102289/',
      },
    };
    const doc1 = await metadataGraph.insertDoc(doc);
    const doc2 = await metadataGraph.insertDoc(doc);
    expect(doc1).toMatchObject(doc2);
  });
  test('fetch by iri is working..', async () => {
    const doc = {
      'http://schema.org/name': 'Bucky Fuller',
      'http://schema.org/url': {
        '@id': 'http://www.wikidata.org/wiki/Q102289/',
      },
    };
    const { iri } = await metadataGraph.insertDoc(doc);
    const metadata = await metadataGraph.fetchByIri(iri);
    expect(metadata).toMatchObject(doc);
  });
  test('fetch by iri throws an error when the iri is not found..', async () => {
    await expect(
      metadataGraph.fetchByIri('regen:abcdefgh.rdf'),
    ).rejects.toThrow();
  });
});
