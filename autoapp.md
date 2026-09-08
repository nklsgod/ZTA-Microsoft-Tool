AgentsInfo
| where Platform =~ "LocalAgents"
| summarize arg_max(Timestamp, *) by AgentId
| where LifecycleStatus !in~ ("Deleted", "Uninstalled")
| where tostring(RawAgentInfo.localAgentMetadata.autoApprove) =~ "true"
| extend
    Agent = Name,
    DeviceKey = tolower(
        tostring(RawAgentInfo.localAgentMetadata.deviceName))
| summarize ProfilesOnDevice = count() by Agent, DeviceKey
| summarize
    AgentProfiles = sum(ProfilesOnDevice),
    DeviceCount = countif(isnotempty(DeviceKey))
    by Agent
| order by AgentProfiles desc
