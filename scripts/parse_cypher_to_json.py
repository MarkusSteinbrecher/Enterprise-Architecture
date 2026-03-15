#!/usr/bin/env python3
"""Parse the Energy Company Cypher file and export elements + relationships as JSON."""
import re
import json
from collections import defaultdict

CYPHER_FILE = "/Users/markus/Code/agentic-ea/neo4j/data/005_hitachi_energy.cypher"
OUTPUT_FILE = "/Users/markus/Code/Enterprise Architecture/docs/data/repository-explorer.json"

AI_STEREOTYPES = {'AIAgent', 'AIModel', 'KnowledgeBase', 'VectorStore',
                  'AgentProtocol', 'PromptTemplate', 'Guardrail', 'AIOrchestrator'}


def parse_cypher():
    with open(CYPHER_FILE, 'r') as f:
        content = f.read()

    elements = []
    relationships = []

    # Parse element blocks: MERGE (e:Element {id: '...'}) SET e.prop = '...', ...
    elem_pattern = re.compile(
        r"MERGE\s+\(e:Element\s+\{id:\s*'([^']+)'\}\)\s*\n\s*SET\s+(.*?)(?=\n\n|\nMERGE|\n//|\Z)",
        re.DOTALL
    )

    for m in elem_pattern.finditer(content):
        eid = m.group(1)
        props_str = m.group(2).strip().rstrip(';')
        props = {'id': eid}

        # Parse e.key = 'value' pairs
        prop_pattern = re.compile(r"e\.(\w+)\s*=\s*'((?:[^'\\]|\\.)*)'")
        for pm in prop_pattern.finditer(props_str):
            props[pm.group(1)] = pm.group(2)

        elements.append(props)

    # Parse relationships: MATCH (s:Element {id: '...'}), (t:Element {id: '...'})
    # MERGE (s)-[:REL_TYPE]->(t);
    rel_pattern = re.compile(
        r"MATCH\s+\(s:Element\s+\{id:\s*'([^']+)'\}\)\s*,\s*\(t:Element\s+\{id:\s*'([^']+)'\}\)\s*\n\s*MERGE\s+\(s\)-\[:(\w+)(?:\s*\{([^}]*)\})?\]->\(t\)",
        re.DOTALL
    )

    for m in rel_pattern.finditer(content):
        rel = {
            'source': m.group(1),
            'target': m.group(2),
            'type': m.group(3)
        }
        relationships.append(rel)

    return elements, relationships


def build_output(elements, relationships):
    # Assign AI Extension elements to a virtual layer
    for e in elements:
        if e.get('stereotype') in AI_STEREOTYPES:
            e['display_layer'] = 'AI Extension'
        else:
            e['display_layer'] = e.get('layer', 'Unknown')

    # Compute stats
    layers = defaultdict(list)
    types = defaultdict(int)
    stereotypes = defaultdict(int)

    for e in elements:
        layer = e['display_layer']
        layers[layer].append(e)
        types[e.get('type', 'Unknown')] += 1
        if 'stereotype' in e:
            stereotypes[e['stereotype']] += 1

    rel_types = defaultdict(int)
    for r in relationships:
        rel_types[r['type']] += 1

    # Layer info with colors
    layer_meta = {
        'Strategy': {'color': '#6366f1', 'order': 0, 'icon': 'compass'},
        'Business': {'color': '#d97706', 'order': 1, 'icon': 'briefcase'},
        'Application': {'color': '#0891b2', 'order': 2, 'icon': 'layers'},
        'Technology': {'color': '#059669', 'order': 3, 'icon': 'server'},
        'Physical': {'color': '#dc2626', 'order': 4, 'icon': 'building'},
        'Motivation': {'color': '#9333ea', 'order': 5, 'icon': 'target'},
        'AI Extension': {'color': '#0d9488', 'order': 6, 'icon': 'cpu'},
    }

    # Build layer summaries
    layer_summaries = []
    for layer_name in sorted(layer_meta.keys(), key=lambda x: layer_meta[x]['order']):
        elems = layers.get(layer_name, [])
        type_counts = defaultdict(int)
        for e in elems:
            st = e.get('stereotype', '')
            label = st if st else e.get('type', 'Unknown')
            type_counts[label] += 1
        layer_summaries.append({
            'name': layer_name,
            'color': layer_meta[layer_name]['color'],
            'icon': layer_meta[layer_name]['icon'],
            'count': len(elems),
            'types': [{'type': t, 'count': c} for t, c in sorted(type_counts.items(), key=lambda x: -x[1])]
        })

    # Build relationship type summaries
    rel_summaries = [{'type': t, 'count': c}
                     for t, c in sorted(rel_types.items(), key=lambda x: -x[1])]

    # Simplify elements for JSON
    elements_out = []
    for e in elements:
        elem = {
            'id': e['id'],
            'name': e.get('name', ''),
            'type': e.get('type', ''),
            'layer': e['display_layer'],
            'description': e.get('description', ''),
        }
        if 'stereotype' in e:
            elem['stereotype'] = e['stereotype']
        elements_out.append(elem)

    # Build graph subset for visualization — top most-connected elements
    conn_count = defaultdict(int)
    for r in relationships:
        conn_count[r['source']] += 1
        conn_count[r['target']] += 1

    top_elements = sorted(conn_count.keys(), key=lambda x: -conn_count[x])[:80]
    top_set = set(top_elements)

    elem_lookup = {e['id']: e for e in elements}
    graph_nodes = []
    for eid in top_elements:
        e = elem_lookup.get(eid)
        if e:
            graph_nodes.append({
                'id': e['id'],
                'name': e.get('name', ''),
                'type': e.get('type', ''),
                'layer': e['display_layer'],
                'stereotype': e.get('stereotype', ''),
                'connections': conn_count[eid]
            })

    graph_edges = []
    for r in relationships:
        if r['source'] in top_set and r['target'] in top_set:
            graph_edges.append({
                'source': r['source'],
                'target': r['target'],
                'type': r['type']
            })

    ai_count = len([e for e in elements if e.get('stereotype') in AI_STEREOTYPES])

    output = {
        'page_type': 'repository-explorer',
        'title': 'EA Repository Explorer',
        'subtitle': 'Energy Company — Living Architecture Repository',
        'description': 'Interactive exploration of a graph-based Enterprise Architecture repository with elements across 7 layers connected by relationships.',
        'hero': {
            'headline': 'The Living Repository',
            'subline': 'A graph-based EA repository where every element is a node and every relationship is a first-class citizen. This is what Enterprise Architecture looks like when it becomes queryable, traversable, and agent-accessible.',
            'stats': [
                {'value': str(len(elements)), 'label': 'Elements', 'detail': f'{len(layer_summaries)} layers'},
                {'value': str(len(relationships)), 'label': 'Relationships', 'detail': f'{len(rel_types)} types'},
                {'value': str(ai_count), 'label': 'AI Extensions', 'detail': 'Agents, models, KBs'},
                {'value': str(len(types)), 'label': 'Element Types', 'detail': 'ArchiMate 3.2'}
            ]
        },
        'layers': layer_summaries,
        'relationship_types': rel_summaries,
        'elements': elements_out,
        'relationships': [{'source': r['source'], 'target': r['target'], 'type': r['type']} for r in relationships],
        'graph': {
            'nodes': graph_nodes,
            'edges': graph_edges,
            'description': f'Top {len(graph_nodes)} most connected elements with {len(graph_edges)} relationships'
        }
    }

    return output


if __name__ == '__main__':
    elements, relationships = parse_cypher()
    print(f"Parsed {len(elements)} elements, {len(relationships)} relationships")

    output = build_output(elements, relationships)

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"Written to {OUTPUT_FILE}")
    print(f"Layers: {', '.join(l['name'] + ' (' + str(l['count']) + ')' for l in output['layers'])}")
    print(f"AI extensions: {output['hero']['stats'][2]['value']}")
    print(f"Relationship types: {', '.join(r['type'] + ' (' + str(r['count']) + ')' for r in output['relationship_types'])}")
    print(f"Graph viz: {len(output['graph']['nodes'])} nodes, {len(output['graph']['edges'])} edges")
