let Gruppen = DeviceInfo
| extend Geraet = tolower(DeviceName)
| summarize arg_max(Timestamp, MachineGroup) by Geraet
| project Geraet, Geraetegruppe = MachineGroup;
AgentsInfo
| where Platform == "LocalAgents"
| summarize Seit = min(Timestamp), arg_max(Timestamp, *) by AgentId
| where LifecycleStatus !in~ ("Deleted", "Uninstalled")
| extend KI_Agent = tostring(column_ifexists("Name", column_ifexists("AgentName", ""))),
         Geraet = tolower(tostring(RawAgentInfo.localAgentMetadata.deviceName))
| where isnotempty(Geraet)
| summarize Seit = min(Seit) by KI_Agent, Geraet
| join kind=leftouter Gruppen on Geraet
| extend Geraetegruppe = iff(isempty(Geraetegruppe), "Nicht zugeordnet", Geraetegruppe)
| summarize Anzahl_Geraete = count(), Seit = min(Seit)
    by KI_Agent, Geraetegruppe
| where Anzahl_Geraete >= 5
| project KI_Agent, Geraetegruppe, Anzahl_Geraete,
          Nachweis_seit_Monat = format_datetime(Seit, "yyyy-MM")
| order by KI_Agent asc, Anzahl_Geraete desc
