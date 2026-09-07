let DeviceGroups =
    DeviceInfo
    | extend DeviceKey = tolower(DeviceName)
    | where isnotempty(DeviceKey)
    | summarize arg_max(Timestamp, MachineGroup) by DeviceKey
    | project DeviceKey, DeviceGroup = MachineGroup;
AgentsInfo
| where Platform =~ "LocalAgents"
| summarize
    FirstRecord = min(Timestamp),
    arg_max(Timestamp, *)
    by AgentId
| where LifecycleStatus !in~ ("Deleted", "Uninstalled")
| extend
    Agent = coalesce(
        tostring(column_ifexists("Name", "")),
        tostring(column_ifexists("AgentName", "")),
        "Unknown agent"),
    DeviceKey = tolower(
        tostring(RawAgentInfo.localAgentMetadata.deviceName))
| join kind=leftouter DeviceGroups on DeviceKey
| extend DeviceGroup = iff(
    isempty(DeviceGroup), "Not mapped", DeviceGroup)
| summarize
    ProfilesOnDevice = count(),
    FirstRecord = min(FirstRecord)
    by Agent, DeviceGroup, DeviceKey
| summarize
    DeviceCount = countif(isnotempty(DeviceKey)),
    AgentProfiles = sum(ProfilesOnDevice),
    FirstRecord = min(FirstRecord)
    by Agent, DeviceGroup
| project
    Agent,
    DeviceGroup,
    DeviceCount,
    AgentProfiles,
    FirstObservedMonth = format_datetime(FirstRecord, "yyyy-MM")
| order by Agent asc, DeviceCount desc
