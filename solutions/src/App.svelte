<script lang="ts">
  import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
  import LinearProgress from '@smui/linear-progress';

  let loaded = false;
  let solutions = [];

  async function onConnectionChange(connectionName: string | undefined) {
    if (!connectionName) {
      loaded = false;
      solutions = [];
      return;
    }

    const query = new URLSearchParams();
    query.set(`$expand`, `publisherid`);
    query.set(`$filter`, `(isvisible eq true)`);
    query.set(`$orderby`, `createdon desc`);

    const res = await window.PowerTools.get('/api/data/v9.0/solutions', query); //view history: /api/data/v9.0/solutionhistories
    const js = await res.asJson();

    solutions = (js as any).value.map((s) => {
      const desc = s.description || '';

      return {
        id: s.solutionid,
        name: s.friendlyname,
        description: `${ desc.substring(0, 100) }${ desc.length > 100 ? '...' : '' }`,
        createdOn: s.createdon,
        uniqueName: s.uniquename,
      };
    });

    loaded = true;
  }

  window.PowerTools.addConnectionChangeListener(onConnectionChange);

  window.PowerTools.onLoad().then(async () => {
    console.log('Svelte app loaded');
  });
</script>

<main>
  <DataTable table$aria-label="User list" style="width: 100%;">
    <Head>
      <Row>
        <Cell style="width: 100%;">Name</Cell>
        <Cell>Description</Cell>
        <Cell>Unique Name</Cell>
        <Cell>Created On</Cell>
      </Row>
    </Head>
    <Body>
      {#each solutions as solution (solution.id)}
        <Row>
          <Cell>{solution.name}</Cell>
          <Cell>{solution.description}</Cell>
          <Cell>{solution.uniqueName}</Cell>
          <Cell>{solution.createdOn}</Cell>
        </Row>
      {/each}
    </Body>
   
    <LinearProgress
      indeterminate
      bind:closed={loaded}
      aria-label="Solutions are being loaded..."
      slot="progress"
    />
  </DataTable>
</main>
