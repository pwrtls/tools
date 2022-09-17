<script lang="ts">
  import Dialog, {
    Header,
    Title,
    Content,
    Actions,
  } from '@smui/dialog';
  import IconButton from '@smui/icon-button';
  import Button, { Label } from '@smui/button';
  import Textfield from '@smui/textfield';
  import DataTable, { Head, Body, Row, Cell } from '@smui/data-table';
  import LayoutGrid, { Cell as LCell } from '@smui/layout-grid';
  import LinearProgress from '@smui/linear-progress';

  let loaded = false;
  let tracelogs = [];

  let open = false;
  //TODO: This should become a type - declared here for the dialog not to error out
  let selectedTrace = {
        id: 0,

        correlationid:0,
        pluginstepid: 0,
        plugintracelogid: 0,
        organizationid: 0,
        requestid: 0,
        issystemcreated: false,
        exceptiondetails: '',
        typename: '',
        messagename: '',
        messageblock: '',
        primaryentity: '',

        performanceconstructorduration: 0,
        performanceconstructorstarttime: 0,
        performanceexecutionduration: 0,
        performanceexecutionstarttime: 0,

        createdOn: new Date(),
      };

  async function onConnectionChange(connectionName: string | undefined) {
    if (!connectionName) {
      loaded = false;
      tracelogs = [];
      return;
    }

    const query = new URLSearchParams();
    //query.set(`$expand`, `publisherid`);
    //query.set(`$filter`, `(isvisible eq true)`);
    //query.set(`$orderby`, `createdon desc`);

    const res = await window.PowerTools.get('/api/data/v9.0/plugintracelogs', query); //view history: /api/data/v9.0/solutionhistories
    const js = await res.asJson();

    console.log("result", js);

    tracelogs = (js as any).value.map((t) => {
      const desc = t.description || '';

      return {
        id: t.correlationid,
        description: `${ desc.substring(0, 100) }${ desc.length > 100 ? '...' : '' }`,

        correlationid: t.correlationid,
        pluginstepid: t.pluginstepid,
        plugintracelogid: t.plugintracelogid,
        organizationid: t.organizationid,
        requestid: t.requestid,
        issystemcreated: t.issystemcreated,
        exceptiondetails: t.exceptiondetails,
        typename: t.typename,
        messagename: t.messagename,
        messageblock: t.messageblock,
        primaryentity: t.primaryentity,

        performanceconstructorduration: t.performanceconstructorduration,
        performanceconstructorstarttime: t.performanceconstructorstarttime,
        performanceexecutionduration: t.performanceexecutionduration,
        performanceexecutionstarttime: t.performanceexecutionstarttime,

        createdOn: t.createdon,
      };
    });

    loaded = true;
  }

  function trim(s: string, length: number) {
    return `${ s.substring(0, length) }${ s.length > length ? '...' : '' }`
  }

  window.PowerTools.addConnectionChangeListener(onConnectionChange);

  window.PowerTools.onLoad().then(async () => {
    console.log('Svelte app loaded');
  });
 
  function closeHandler(e: CustomEvent<{ action: string }>) {
    switch (e.detail.action) {
      
    }
  }

  function detailClickHandler(log) {
    open = true;
    selectedTrace = log;
  }
</script>

<main>
  <DataTable table$aria-label="User list" style="width: 100%;">
    <Head>
      <Row>
        <Cell>Entity</Cell>
        <Cell>TypeName</Cell>
        <Cell>Exception Details</Cell>
        <Cell>Message Block</Cell>
        <Cell>Created On</Cell>
        <Cell></Cell>
      </Row>
    </Head>
    <Body>
      {#each tracelogs as log (log.correlationid)}
        <Row>
          <Cell>{log.primaryentity}</Cell>
          <Cell>{trim(log.typename, 10)}</Cell>
          <Cell>{trim(log.exceptiondetails, 30)}</Cell>
          <Cell>{trim(log.messageblock, 10)}</Cell>
          <Cell>{log.createdOn}</Cell>
          <Cell>
            <Button on:click={() => detailClickHandler(log)}>
              <Label>Details</Label>
            </Button>
        </Cell>
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

  <Dialog
  bind:open
  fullscreen
  aria-labelledby="over-fullscreen-title"
  aria-describedby="over-fullscreen-content"
  on:SMUIDialog:closed={closeHandler}
>
  <Header>
    <Title id="over-fullscreen-title">Primary Entity: {selectedTrace.primaryentity}</Title>
    <IconButton action="close" class="material-icons">close</IconButton>
  </Header>
  <Content id="over-fullscreen-content">
    <LayoutGrid>
      <LCell span={12}>
        <Textfield
          style="width: 100%;"
          helperLine$style="width: 100%;"
          textarea
          bind:value={selectedTrace.typename}
          disabled
          label="TypeName">
        </Textfield>
      </LCell>
      <LCell span={12}>
        <Textfield
          style="width: 100%;height: 200px"
          helperLine$style="width: 100%;"
          textarea
          bind:value={selectedTrace.exceptiondetails}
          disabled
          label="Exception Detail">
        </Textfield>
      </LCell>
      <LCell span={12}>
        <Textfield
          style="width: 100%;height: 200px"
          helperLine$style="width: 100%;"
          textarea
          bind:value={selectedTrace.messageblock}
          disabled
          label="Trace Message">
        </Textfield>
      </LCell>
    </LayoutGrid>
  </Content>
  <Actions>
    <Button action="accept" defaultAction>
      <Label>Close</Label>
    </Button>
  </Actions>
</Dialog>

</main>
