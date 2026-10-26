import { useState } from "react";
import {
  Button,
  IconButton,
  Link,
  Field,
  Input,
  TextArea,
  NumberInput,
  Select,
  Checkbox,
  ThemeProvider,
  ThemeSwitch,
} from "@typeshade/site-ui/react";

export default function Examples() {
  const [clicks, setClicks] = useState(0);
  const [submissions, setSubmissions] = useState(0);
  const [name, setName] = useState("");
  const [validate, setValidate] = useState(false);
  const [batch, setBatch] = useState<number | null>(32);
  const [optimizer, setOptimizer] = useState("adam");
  const [checked, setChecked] = useState(false);
  return (
    <ThemeProvider>
      <section aria-labelledby="theme-heading">
        <h2 id="theme-heading">Theme</h2>
        <ThemeSwitch
          storageKey="ui-preview-theme"
          darkLabel="Dark theme"
          lightLabel="Light theme"
        />
      </section>
      <section aria-labelledby="buttons-heading">
        <h2 id="buttons-heading">React actions</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmissions((v) => v + 1);
          }}
        >
          <div className="example-row">
            <Button variant="primary" onClick={() => setClicks((v) => v + 1)}>
              Run model
            </Button>
            <Button>Secondary action</Button>
            <Button variant="quiet">Quiet action</Button>
            <Button tone="danger">Cancel run</Button>
            <Button tone="danger" variant="primary">
              Delete result
            </Button>
            <Button disabled onClick={() => setClicks((v) => v + 1)}>
              Disabled action
            </Button>
            <Button loading onClick={() => setClicks((v) => v + 1)}>
              Preparing model
            </Button>
            <IconButton
              label="Copy settings"
              onClick={() => setClicks((v) => v + 1)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M8 8h12v12H8zM4 16V4h12" />
              </svg>
            </IconButton>
            <Link href="#forms-heading">View form examples</Link>
            <Button type="submit">Submit example</Button>
          </div>
          <p role="status" data-testid="actions-result">
            Actions: {clicks}. Submissions: {submissions}.
          </p>
        </form>
        <div className="example-row">
          <Button size="small">Small action</Button>
          <Button>Default action</Button>
          <Button size="large">Large action</Button>
          <Button variant="primary" lang="ko">
            선택한 데이터셋으로 새로운 모델 학습을 시작합니다
          </Button>
        </div>
      </section>
      <section aria-labelledby="forms-heading">
        <h2 id="forms-heading">Fields and states</h2>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setValidate(true);
          }}
        >
          <div className="example-grid">
            <Field
              label="Model name"
              required
              description="Give this experiment a descriptive name."
              error={
                validate && !name.trim() ? "Enter a model name." : undefined
              }
            >
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Batch size"
              description="Choose between 1 and 128 examples."
            >
              <NumberInput
                min={1}
                max={128}
                value={batch}
                onChange={setBatch}
              />
            </Field>
            <Field
              label="Optimizer"
              description="Used for the next training run."
            >
              <Select
                value={optimizer}
                onChange={setOptimizer}
                options={[
                  { value: "adam", label: "Adam" },
                  { value: "sgd", label: "SGD" },
                ]}
              />
            </Field>
            <Field
              label="Unavailable input"
              description="Available after a model is loaded."
              disabled
            >
              <Input value="Waiting for a model" readOnly />
            </Field>
            <Field
              label="Invalid number"
              error="Use a value greater than zero."
            >
              <NumberInput value={0} />
            </Field>
            <Field label="Unavailable optimizer" disabled>
              <Select
                value="adam"
                options={[{ value: "adam", label: "Adam" }]}
              />
            </Field>
            <Field
              label="Notes"
              description="Optional context for this experiment."
            >
              <TextArea rows={3} />
            </Field>
            <Field
              label="실험 결과에 저장할 모델 이름"
              description="긴 한국어 도움말도 좁은 화면에서 입력 필드의 너비를 넘지 않고 줄바꿈되어야 합니다."
            >
              <Input lang="ko" />
            </Field>
          </div>
          <Checkbox
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          >
            Keep settings for the next run
          </Checkbox>
          <div className="example-row">
            <Button type="submit" variant="primary">
              Validate fields
            </Button>
            <Button
              onClick={() => {
                setValidate(false);
                setName("");
              }}
            >
              Reset validation
            </Button>
          </div>
        </form>
        <p role="status" data-testid="form-result">
          Batch: {batch ?? "empty"}. Optimizer: {optimizer}. Keep settings:{" "}
          {checked ? "yes" : "no"}.
        </p>
        <div
          className="example-grid"
          aria-label="Repeated labels in independent forms"
        >
          <Field label="Repeated field">
            <Input />
          </Field>
          <Field label="Repeated field">
            <Input />
          </Field>
        </div>
      </section>
    </ThemeProvider>
  );
}
