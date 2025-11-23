import z from "zod";

export const CustomNodeId = z.string().brand("CustomNodeId");
export type CustomNodeId = z.infer<typeof CustomNodeId>;

const GraphId = z.string().brand<'GraphId'>();
export type GraphId = z.infer<typeof GraphId>;

export const CustomNodeSchema = z.object({
    id: CustomNodeId,
    label: z.string(),
    parents: z.array(CustomNodeId),
    isNew: z.boolean().default(false),
    graph: GraphId
});
export type CustomNode = z.infer<typeof CustomNodeSchema>;

