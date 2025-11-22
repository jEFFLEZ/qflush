export type NodeType = 'message' | 'concept';

export interface Node {
  id: string;
  type: NodeType;
  payloadRef?: string;
}

export type RelationType = 'sequence' | 'cause' | 'combo';

export interface Edge {
  from: string;
  to: string;
  relation: RelationType;
  weight: number;
}

export class SpiderWeb {
  nodes = new Map<string, Node>();
  edges: Edge[] = [];

  addNode(node: Node) {
    this.nodes.set(node.id, node);
  }

  addEdge(from: string, to: string, relation: RelationType) {
    const existing = this.edges.find(
      e => e.from === from && e.to === to && e.relation === relation
    );
    if (existing) {
      existing.weight += 1;
    } else {
      this.edges.push({ from, to, relation, weight: 1 });
    }
  }
}
