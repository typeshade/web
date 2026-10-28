import { useState } from "react";
import {
  ThemeProvider,
  ThemeSwitch,
  Tabs,
  Toolbar,
  Panel,
  Button,
  EmptyState,
  Alert,
} from "@typeshade/site-ui/react";
export default function Patterns() {
  const [tab, setTab] = useState("result");
  return (
    <ThemeProvider>
      <section aria-labelledby="react-patterns-heading">
        <h2 id="react-patterns-heading">React compositions</h2>
        <ThemeSwitch
          storageKey="ui-patterns-theme"
          darkLabel="Dark theme"
          lightLabel="Light theme"
        />
        <Panel aria-label="Result workspace">
          <Toolbar label="Result actions">
            <Button>Copy result</Button>
            <Button disabled>Export result</Button>
          </Toolbar>
          <Tabs
            label="Result views"
            value={tab}
            onChange={setTab}
            items={[
              {
                key: "result",
                label: "Result",
                children: (
                  <EmptyState>Run a model to see its output.</EmptyState>
                ),
              },
              {
                key: "unavailable",
                label: "Unavailable",
                disabled: true,
                children: "Not available",
              },
              {
                key: "source",
                label: "Source",
                children: <p>Generated source preview.</p>,
              },
              {
                key: "diagnostics",
                label: "Diagnostics",
                children: (
                  <Alert tone="danger">Check the input dimensions.</Alert>
                ),
              },
            ]}
          />
          <output data-testid="selected-tab">{tab}</output>
        </Panel>
        <Alert tone="info">
          A static explanation does not interrupt a screen reader.
        </Alert>
        <Alert tone="success" live>
          Example completed.
        </Alert>
      </section>
    </ThemeProvider>
  );
}
