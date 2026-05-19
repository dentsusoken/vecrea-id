"use client";

import { useState } from "react";
import {
  adminCreateUser,
  adminGetUser,
  adminDeleteUser,
  adminEnableUser,
  adminDisableUser,
  adminConfirmSignUp,
  adminUpdateAttributes,
  adminSetPassword,
  adminResetPassword,
  adminSignOutGlobally,
  adminListUsers,
  adminCreateGroup,
  adminGetGroup,
  adminUpdateGroup,
  adminDeleteGroup,
  adminListAllGroups,
  adminAddUserToGroup,
  adminRemoveUserFromGroup,
  adminListGroupsForUser,
  adminListUsersInGroup,
  adminSignIn,
} from "../_actions";
import { DemoCard, Field, Btn, ResultBox, useApiCall } from "./shared";
import type { AdminConfig } from "./shared";

interface Props {
  adminConfig: AdminConfig;
  clientId: string;
}

// ---- User operations ----

function AdminCreateUserCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const [tmpPassword, setTmpPassword] = useState("");
  const [email, setEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const api = useApiCall();

  function run() {
    api.run(async () =>
      adminCreateUser(adminConfig, {
        username,
        temporaryPassword: tmpPassword || undefined,
        attributes: email ? { email } : undefined,
        sendEmail,
      }),
    );
  }

  return (
    <DemoCard
      title="admin.users.create"
      signature="admin.users.create({ username, temporaryPassword?, attributes?, sendEmail? })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="user@example.com"
        />
        <Field
          label="Temporary Password (optional)"
          value={tmpPassword}
          onChange={setTmpPassword}
          type="password"
          placeholder="••••••••"
        />
        <Field
          label="email attribute (optional)"
          value={email}
          onChange={setEmail}
          placeholder="user@example.com"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
          />
          Send welcome email
        </label>
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.users.create"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminGetUserCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => adminGetUser(adminConfig, { username }));
  }

  return (
    <DemoCard title="admin.users.get" signature="admin.users.get({ username })">
      <Field
        label="Username"
        value={username}
        onChange={setUsername}
        placeholder="user@example.com"
      />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.users.get"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminDeleteUserCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const api = useApiCall();

  function run() {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    api.run(async () => adminDeleteUser(adminConfig, { username }));
  }

  return (
    <DemoCard title="admin.users.delete" signature="admin.users.delete({ username })">
      <Field label="Username" value={username} onChange={setUsername} />
      <Btn onClick={run} disabled={api.loading} variant="danger">
        {api.loading ? "Running..." : "Run admin.users.delete"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminEnableDisableCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const enableApi = useApiCall();
  const disableApi = useApiCall();

  return (
    <DemoCard
      title="admin.users.enable / disable"
      signature="admin.users.enable({ username }) | admin.users.disable({ username })"
    >
      <Field label="Username" value={username} onChange={setUsername} />
      <div className="flex gap-2">
        <Btn
          onClick={() => enableApi.run(async () => adminEnableUser(adminConfig, { username }))}
          disabled={enableApi.loading}
        >
          {enableApi.loading ? "Running..." : "Enable"}
        </Btn>
        <Btn
          onClick={() => disableApi.run(async () => adminDisableUser(adminConfig, { username }))}
          disabled={disableApi.loading}
          variant="danger"
        >
          {disableApi.loading ? "Running..." : "Disable"}
        </Btn>
      </div>
      <ResultBox
        result={enableApi.result ?? disableApi.result}
        error={enableApi.error ?? disableApi.error}
      />
    </DemoCard>
  );
}

function AdminConfirmSignUpCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => adminConfirmSignUp(adminConfig, { username }));
  }

  return (
    <DemoCard title="admin.users.confirmSignUp" signature="admin.users.confirmSignUp({ username })">
      <Field label="Username" value={username} onChange={setUsername} />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.users.confirmSignUp"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminUpdateAttributesCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const [attrKey, setAttrKey] = useState("name");
  const [attrValue, setAttrValue] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () =>
      adminUpdateAttributes(adminConfig, {
        username,
        attributes: { [attrKey]: attrValue },
      }),
    );
  }

  return (
    <DemoCard
      title="admin.users.updateAttributes"
      signature="admin.users.updateAttributes({ username, attributes })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Username" value={username} onChange={setUsername} />
        <Field label="Attribute Name" value={attrKey} onChange={setAttrKey} placeholder="name" />
        <Field label="Attribute Value" value={attrValue} onChange={setAttrValue} />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.users.updateAttributes"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminSetPasswordCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [permanent, setPermanent] = useState(true);
  const api = useApiCall();

  function run() {
    api.run(async () => adminSetPassword(adminConfig, { username, password, permanent }));
  }

  return (
    <DemoCard
      title="admin.users.setPassword"
      signature="admin.users.setPassword({ username, password, permanent? })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Username" value={username} onChange={setUsername} />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="••••••••"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={permanent}
            onChange={(e) => setPermanent(e.target.checked)}
          />
          Permanent password
        </label>
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.users.setPassword"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminResetPasswordCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => adminResetPassword(adminConfig, { username }));
  }

  return (
    <DemoCard title="admin.users.resetPassword" signature="admin.users.resetPassword({ username })">
      <Field label="Username" value={username} onChange={setUsername} />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.users.resetPassword"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminSignOutGloballyCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => adminSignOutGlobally(adminConfig, { username }));
  }

  return (
    <DemoCard
      title="admin.users.signOutGlobally"
      signature="admin.users.signOutGlobally({ username })"
    >
      <Field label="Username" value={username} onChange={setUsername} />
      <Btn onClick={run} disabled={api.loading} variant="danger">
        {api.loading ? "Running..." : "Run admin.users.signOutGlobally"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminListUsersCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState("20");
  const api = useApiCall();

  function run() {
    api.run(async () =>
      adminListUsers(adminConfig, {
        filter: filter || undefined,
        limit: limit ? Number(limit) : undefined,
      }),
    );
  }

  return (
    <DemoCard
      title="admin.users.list"
      signature='admin.users.list({ filter?, limit? })  // filter e.g. "username = \\"john\\""'
    >
      <div className="flex flex-col gap-2">
        <Field
          label='Filter (optional, e.g. username ^= "john")'
          value={filter}
          onChange={setFilter}
          placeholder='username ^= "john"'
        />
        <Field label="Limit" value={limit} onChange={setLimit} placeholder="20" />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.users.list"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

// ---- Group operations ----

function AdminCreateGroupCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () =>
      adminCreateGroup(adminConfig, { groupName, description: description || undefined }),
    );
  }

  return (
    <DemoCard
      title="admin.groups.create"
      signature="admin.groups.create({ groupName, description? })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Group Name" value={groupName} onChange={setGroupName} placeholder="admins" />
        <Field label="Description (optional)" value={description} onChange={setDescription} />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.groups.create"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminGetGroupCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [groupName, setGroupName] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => adminGetGroup(adminConfig, { groupName }));
  }

  return (
    <DemoCard title="admin.groups.get" signature="admin.groups.get({ groupName })">
      <Field label="Group Name" value={groupName} onChange={setGroupName} />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.groups.get"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminUpdateGroupCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () =>
      adminUpdateGroup(adminConfig, { groupName, description: description || undefined }),
    );
  }

  return (
    <DemoCard
      title="admin.groups.update"
      signature="admin.groups.update({ groupName, description? })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Group Name" value={groupName} onChange={setGroupName} />
        <Field label="New Description (optional)" value={description} onChange={setDescription} />
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.groups.update"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminDeleteGroupCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [groupName, setGroupName] = useState("");
  const api = useApiCall();

  function run() {
    if (!window.confirm(`Delete group "${groupName}"?`)) return;
    api.run(async () => adminDeleteGroup(adminConfig, { groupName }));
  }

  return (
    <DemoCard title="admin.groups.delete" signature="admin.groups.delete({ groupName })">
      <Field label="Group Name" value={groupName} onChange={setGroupName} />
      <Btn onClick={run} disabled={api.loading} variant="danger">
        {api.loading ? "Running..." : "Run admin.groups.delete"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminListAllGroupsCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const api = useApiCall();

  function run() {
    api.run(async () => adminListAllGroups(adminConfig));
  }

  return (
    <DemoCard title="admin.groups.listAll" signature="admin.groups.listAll()">
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.groups.listAll"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminGroupUserCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [groupName, setGroupName] = useState("");
  const [username, setUsername] = useState("");
  const addApi = useApiCall();
  const removeApi = useApiCall();

  return (
    <DemoCard
      title="admin.groups.addUser / removeUser"
      signature="admin.groups.addUser({ groupName, username }) | admin.groups.removeUser({ groupName, username })"
    >
      <div className="flex flex-col gap-2">
        <Field label="Group Name" value={groupName} onChange={setGroupName} />
        <Field label="Username" value={username} onChange={setUsername} />
      </div>
      <div className="flex gap-2">
        <Btn
          onClick={() =>
            addApi.run(async () => adminAddUserToGroup(adminConfig, { groupName, username }))
          }
          disabled={addApi.loading}
        >
          {addApi.loading ? "Adding..." : "Add User"}
        </Btn>
        <Btn
          onClick={() =>
            removeApi.run(async () =>
              adminRemoveUserFromGroup(adminConfig, { groupName, username }),
            )
          }
          disabled={removeApi.loading}
          variant="danger"
        >
          {removeApi.loading ? "Removing..." : "Remove User"}
        </Btn>
      </div>
      <ResultBox
        result={addApi.result ?? removeApi.result}
        error={addApi.error ?? removeApi.error}
      />
    </DemoCard>
  );
}

function AdminListGroupsForUserCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [username, setUsername] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => adminListGroupsForUser(adminConfig, { username }));
  }

  return (
    <DemoCard title="admin.groups.listForUser" signature="admin.groups.listForUser({ username })">
      <Field label="Username" value={username} onChange={setUsername} />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.groups.listForUser"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

function AdminListUsersInGroupCard({ adminConfig }: { adminConfig: AdminConfig }) {
  const [groupName, setGroupName] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => adminListUsersInGroup(adminConfig, { groupName }));
  }

  return (
    <DemoCard title="admin.groups.listUsers" signature="admin.groups.listUsers({ groupName })">
      <Field label="Group Name" value={groupName} onChange={setGroupName} />
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.groups.listUsers"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

// ---- Auth ----

function AdminSignInCard({ adminConfig, clientId }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const api = useApiCall();

  function run() {
    api.run(async () => adminSignIn(adminConfig, { clientId, username, password }));
  }

  return (
    <DemoCard
      title="admin.auth.signIn"
      signature="admin.auth.signIn({ clientId, username, password })"
    >
      <div className="flex flex-col gap-2">
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="user@example.com"
        />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="••••••••"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Using clientId from config: <code>{clientId || "(not set)"}</code>
        </p>
      </div>
      <Btn onClick={run} disabled={api.loading}>
        {api.loading ? "Running..." : "Run admin.auth.signIn"}
      </Btn>
      <ResultBox result={api.result} error={api.error} />
    </DemoCard>
  );
}

// ---- Section dividers ----

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 pt-2 pb-1 border-b border-zinc-200 dark:border-zinc-700">
      {children}
    </h3>
  );
}

export function AdminSection({ adminConfig, clientId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeading>User Operations</SectionHeading>
      <AdminCreateUserCard adminConfig={adminConfig} />
      <AdminGetUserCard adminConfig={adminConfig} />
      <AdminListUsersCard adminConfig={adminConfig} />
      <AdminEnableDisableCard adminConfig={adminConfig} />
      <AdminConfirmSignUpCard adminConfig={adminConfig} />
      <AdminUpdateAttributesCard adminConfig={adminConfig} />
      <AdminSetPasswordCard adminConfig={adminConfig} />
      <AdminResetPasswordCard adminConfig={adminConfig} />
      <AdminSignOutGloballyCard adminConfig={adminConfig} />
      <AdminDeleteUserCard adminConfig={adminConfig} />

      <SectionHeading>Group Operations</SectionHeading>
      <AdminCreateGroupCard adminConfig={adminConfig} />
      <AdminGetGroupCard adminConfig={adminConfig} />
      <AdminUpdateGroupCard adminConfig={adminConfig} />
      <AdminListAllGroupsCard adminConfig={adminConfig} />
      <AdminGroupUserCard adminConfig={adminConfig} />
      <AdminListGroupsForUserCard adminConfig={adminConfig} />
      <AdminListUsersInGroupCard adminConfig={adminConfig} />
      <AdminDeleteGroupCard adminConfig={adminConfig} />

      <SectionHeading>Auth</SectionHeading>
      <AdminSignInCard adminConfig={adminConfig} clientId={clientId} />
    </div>
  );
}
