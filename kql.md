let DeviceGroups =
    DeviceInfo
    | extend DeviceKey = tolower(DeviceName)
    | where isnotempty(DeviceKey)
    | summarize arg_max(Timestamp, MachineGroup) by DeviceKey
    | project DeviceKey, DeviceGroup = MachineGroup;
let Inventory =
    AgentsInfo
    | where Platform =~ "LocalAgents"
    | summarize FirstRecord = min(Timestamp),
                arg_max(Timestamp, *) by AgentId
    | where LifecycleStatus !in~ ("Deleted", "Uninstalled")
    | extend
        Agent = coalesce(
            tostring(column_ifexists("Name", "")),
            tostring(column_ifexists("AgentName", "")),
            "Unknown agent"),
        DeviceKey = tolower(
            tostring(RawAgentInfo.localAgentMetadata.deviceName)),
        AutoApprove = tolower(
            tostring(RawAgentInfo.localAgentMetadata.autoApprove))
    | join kind=leftouter DeviceGroups on DeviceKey
    | extend DeviceGroup =
        iff(isempty(DeviceGroup), "Not mapped", DeviceGroup)
    | summarize
        ProfilesOnDevice = count(),
        ApproveEnabled = countif(AutoApprove == "true"),
        ApproveDisabled = countif(AutoApprove == "false"),
        ApproveUnknown = countif(AutoApprove !in ("true", "false")),
        FirstRecord = min(FirstRecord)
        by Agent, DeviceGroup, DeviceKey;
let Details =
    Inventory
    | summarize
        DeviceCount = countif(isnotempty(DeviceKey)),
        AgentProfiles = sum(ProfilesOnDevice),
        AutoApproveEnabled = sum(ApproveEnabled),
        AutoApproveDisabled = sum(ApproveDisabled),
        AutoApproveUnknown = sum(ApproveUnknown),
        FirstRecord = min(FirstRecord)
        by Agent, DeviceGroup
    | extend SortOrder = 0;
let Total =
    Inventory
    | summarize
        ProfilesOnDevice = sum(ProfilesOnDevice),
        ApproveEnabled = sum(ApproveEnabled),
        ApproveDisabled = sum(ApproveDisabled),
        ApproveUnknown = sum(ApproveUnknown),
        FirstRecord = min(FirstRecord)
        by DeviceKey
    | summarize
        DeviceCount = countif(isnotempty(DeviceKey)),
        AgentProfiles = sum(ProfilesOnDevice),
        AutoApproveEnabled = sum(ApproveEnabled),
        AutoApproveDisabled = sum(ApproveDisabled),
        AutoApproveUnknown = sum(ApproveUnknown),
        FirstRecord = min(FirstRecord)
    | extend Agent = "TOTAL", DeviceGroup = "All groups", SortOrder = 1;
union Details, Total
| order by SortOrder asc, Agent asc, DeviceCount desc
| project
    Agent,
    DeviceGroup,
    DeviceCount,
    AgentProfiles,
    AutoApproveEnabled,
    AutoApproveDisabled,
    AutoApproveUnknown,
    FirstObservedMonth = format_datetime(FirstRecord, "yyyy-MM")
