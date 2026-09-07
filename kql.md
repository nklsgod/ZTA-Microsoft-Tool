let Zeitraum = 30d;
let Mindestgeraete = 5; // Kleinere Ergebnisgruppen werden ausgeblendet.

// Gerätezuordnung: intern über Entra-Geräte-ID oder Gerätenamen
let Geraetegruppen =
    DeviceInfo
    | where Timestamp >= ago(Zeitraum)
    | summarize arg_max(
        Timestamp, DeviceName, AadDeviceId, MachineGroup
      ) by DeviceId
    | extend Schluessel = pack_array(
        iff(isnotempty(AadDeviceId),
            strcat("aad:", tolower(AadDeviceId)), ""),
        iff(isnotempty(DeviceName),
            strcat("name:", tolower(DeviceName)), "")
      )
    | mv-expand JoinKey = Schluessel to typeof(string)
    | where isnotempty(JoinKey)
    | summarize arg_max(Timestamp, DeviceId, MachineGroup) by JoinKey
    | project JoinKey,
              MdeDeviceId = DeviceId,
              Geraetegruppe = MachineGroup;

// Neuester verfügbarer Inventarstand je Agentenprofil
AgentsInfo
| where Timestamp >= ago(Zeitraum)
| where Platform == "LocalAgents"
| extend KI_Agent = coalesce(
    tostring(column_ifexists("Name", "")),
    tostring(column_ifexists("AgentName", ""))
  )
| summarize
    ErsterNachweis = min(Timestamp),
    arg_max(Timestamp, KI_Agent, LifecycleStatus, RawAgentInfo)
  by AgentId
| where LifecycleStatus !in~ ("Deleted", "Uninstalled")
| extend Metadaten = RawAgentInfo.localAgentMetadata
| extend AadId = tolower(tostring(Metadaten.aadDeviceId)),
         Rechnername = tolower(tostring(Metadaten.deviceName))
| extend JoinKey = case(
    isnotempty(AadId), strcat("aad:", AadId),
    isnotempty(Rechnername), strcat("name:", Rechnername),
    ""
  )
| where isnotempty(JoinKey) and isnotempty(KI_Agent)
| join kind=leftouter Geraetegruppen on JoinKey
| extend Geraetegruppe = iff(
    isempty(Geraetegruppe), "Nicht zugeordnet", Geraetegruppe
  )
| extend GeraeteKey = coalesce(MdeDeviceId, JoinKey)

// Dasselbe Produkt auf demselben Gerät nur einmal zählen
| summarize ErsterNachweis = min(ErsterNachweis)
  by KI_Agent, Geraetegruppe, GeraeteKey
| summarize
    AnzahlGeraete = count(),
    ErsterNachweis = min(ErsterNachweis)
  by KI_Agent, Geraetegruppe
| where AnzahlGeraete >= Mindestgeraete

// Ausschließlich aggregierte Ausgabe; Datum auf Monat vergröbert
| project
    KI_Agent,
    Geraetegruppe,
    AnzahlGeraete,
    Nachweis_seit_Monat = format_datetime(ErsterNachweis, "yyyy-MM")
| order by KI_Agent asc, AnzahlGeraete desc
