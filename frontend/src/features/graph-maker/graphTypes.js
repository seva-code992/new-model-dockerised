import { BarPlotIcon, HeatmapIcon, NetworkIcon } from "./icons/GraphIcons.jsx";

/** The graphs the user can choose from. */
export const GRAPH_TYPES = [
  { id: "bar", label: "Bar plot", infoTitle: "Create a bar plot", Icon: BarPlotIcon },
  { id: "heatmap", label: "Heatmap", infoTitle: "Create a heatmap", Icon: HeatmapIcon },
  { id: "network", label: "Network graph", infoTitle: "Create a network graph", Icon: NetworkIcon },
];

/** What the user needs to know before importing data, per graph: [bold heading, text] paragraphs. */
export const INFO_TEXT = {
  bar: [
    ["Data selection options: ", "The currently supported formats are .xlsx or our custom-made editor."],
    ["Important information for .xlsx documents: ", "the first row must be headers, the first column must be qualitative values (gene IDs or labels) and the second column must be quantitative values (similarity scores or lengths). Optional: a third column with a group name and a fourth column with a description."],
    ["Important information for the editor: ", "data from the above search features should be pasted as tables (choose “Copy table” from the Semantic search or Find about genes above)."],
  ],
  heatmap: [
    ["Data selection options: ", "The currently supported format is our custom-made editor."],
    ["Important information for the editor: ", "data from the above search features should be pasted as tables (choose “Copy table” from the Semantic search or Find about genes above). Add two or more groups; the heatmap compares their gene IDs, or chromosomes, PFAMs and KEGG pathways when you paste a Find about genes table."],
  ],
  network: [
    ["Data selection options: ", "The currently supported format is our custom-made editor."],
    ["Important information for the editor: ", "data from the Semantic search feature should be pasted in JSON format (choose “Copy in JSON format” from above). Every pasted JSON becomes one coloured group of genes."],
  ],
};
