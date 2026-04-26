/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IObservable, IObserver } from '../base';
import { type IDebugHelper, type IGraphInfo } from '../observables/baseObservable';
import { Derived } from '../observables/derivedImpl';
import { FromEventObservable } from '../observables/observableFromEvent';
import { ObservableValue } from '../observables/observableValue';
import { AutorunObserver } from '../reactions/autorunImpl';
import { ManualObserver } from '../experimental/manualObserver';
import { formatValue } from './consoleObservableLogger';

type GraphNode = IObservable<any> | IObserver | ManualObserver;

// ---------------------------------------------------------------------------
// GraphInfo — the result of graph traversal, separated from rendering
// ---------------------------------------------------------------------------

export class GraphInfo implements IGraphInfo {
	constructor(
		readonly name: string,
		readonly type: string,
		readonly value: unknown,
		readonly state: string,
		readonly children: readonly GraphInfo[],
	) { }
}

// ---------------------------------------------------------------------------
// Graph building — resolves the observable/observer graph into GraphInfo
// ---------------------------------------------------------------------------

interface IBuildGraphOptions {
	readonly type: 'dependencies' | 'observers';
	readonly debugNamePostProcessor?: (name: string) => string;
}

function buildGraph(obs: GraphNode, options: IBuildGraphOptions): GraphInfo | undefined {
	const debugNamePostProcessor = options.debugNamePostProcessor ?? ((s: string) => s);
	const visited = new Map<GraphNode, GraphInfo>();

	function build(node: GraphNode): GraphInfo {
		const existing = visited.get(node);
		if (existing) { return existing; }

		const info = RawInfo.from(node, debugNamePostProcessor) ?? RawInfo.unknown(node);
		const children = options.type === 'observers' ? info.observers : info.dependencies;

		const graphInfo = new GraphInfo(info.name, info.type, info.value, info.state, []);
		visited.set(info.sourceObj, graphInfo);

		(graphInfo.children as GraphInfo[]).push(...children.map(build));
		return graphInfo;
	}

	const root = RawInfo.from(obs, debugNamePostProcessor);
	if (!root) { return undefined; }
	return build(obs);
}

// ---------------------------------------------------------------------------
// Text backend
// ---------------------------------------------------------------------------

function formatAsText(graph: GraphInfo): string {
	const visited = new Set<GraphInfo>();
	return formatNodeAsText(graph, 0, visited).trim();
}

function formatNodeAsText(node: GraphInfo, indentLevel: number, visited: Set<GraphInfo>): string {
	const indent = '\t\t'.repeat(indentLevel);
	const lines: string[] = [];

	if (visited.has(node)) {
		lines.push(`${indent}* ${node.type} ${node.name} (already listed)`);
		return lines.join('\n');
	}
	visited.add(node);

	lines.push(`${indent}* ${node.type} ${node.name}:`);
	lines.push(`${indent}  value: ${formatValue(node.value, 50)}`);
	lines.push(`${indent}  state: ${node.state}`);

	if (node.children.length > 0) {
		lines.push(`${indent}  children:`);
		for (const child of node.children) {
			lines.push(formatNodeAsText(child, indentLevel + 1, visited));
		}
	}

	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Mermaid backend
// ---------------------------------------------------------------------------

function formatAsMermaid(graph: GraphInfo): string {
	const nodeIds = new Map<GraphInfo, string>();
	let nextId = 0;
	const getNodeId = (node: GraphInfo): string => {
		let id = nodeIds.get(node);
		if (!id) {
			id = `n${nextId++}`;
			nodeIds.set(node, id);
		}
		return id;
	};

	const lines: string[] = ['graph TD'];
	const visited = new Set<GraphInfo>();
	const escape = (s: string) => s.replace(/"/g, '#quot;');

	function visit(node: GraphInfo): void {
		if (visited.has(node)) { return; }
		visited.add(node);

		const id = getNodeId(node);
		const label = `${node.type}: ${node.name}\\nstate: ${node.state}${node.value !== undefined ? `\\nvalue: ${formatValue(node.value, 30)}` : ''}`;
		lines.push(`    ${id}["${escape(label)}"]`);

		for (const child of node.children) {
			lines.push(`    ${id} --> ${getNodeId(child)}`);
			visit(child);
		}
	}

	visit(graph);
	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Graphviz DOT backend
// ---------------------------------------------------------------------------

function formatAsGraphviz(graph: GraphInfo): string {
	const nodeIds = new Map<GraphInfo, string>();
	let nextId = 0;
	const getNodeId = (node: GraphInfo): string => {
		let id = nodeIds.get(node);
		if (!id) {
			id = `n${nextId++}`;
			nodeIds.set(node, id);
		}
		return id;
	};

	const lines: string[] = ['digraph {'];
	const visited = new Set<GraphInfo>();
	const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

	function visit(node: GraphInfo): void {
		if (visited.has(node)) { return; }
		visited.add(node);

		const id = getNodeId(node);
		const label = `${node.type}: ${node.name}\nstate: ${node.state}${node.value !== undefined ? `\nvalue: ${formatValue(node.value, 30)}` : ''}`;
		lines.push(`    ${id} [label="${escape(label)}"]`);

		for (const child of node.children) {
			lines.push(`    ${id} -> ${getNodeId(child)}`);
			visit(child);
		}
	}

	visit(graph);
	lines.push('}');
	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// DebugHelper — the public API for .debug on observables and observers
// ---------------------------------------------------------------------------

export class DebugHelper implements IDebugHelper {
	constructor(private readonly _node: object) { }

	buildDependencyGraph(): GraphInfo | undefined {
		return buildGraph(this._node as GraphNode, { type: 'dependencies' });
	}

	buildObserverGraph(): GraphInfo | undefined {
		return buildGraph(this._node as GraphNode, { type: 'observers' });
	}

	getDependencyGraph(): string {
		const graph = this.buildDependencyGraph();
		return graph ? formatAsText(graph) : '';
	}

	getObserverGraph(): string {
		const graph = this.buildObserverGraph();
		return graph ? formatAsText(graph) : '';
	}

	getDependencyMermaid(): string {
		const graph = this.buildDependencyGraph();
		return graph ? formatAsMermaid(graph) : '';
	}

	getObserverMermaid(): string {
		const graph = this.buildObserverGraph();
		return graph ? formatAsMermaid(graph) : '';
	}

	getDependencyGraphviz(): string {
		const graph = this.buildDependencyGraph();
		return graph ? formatAsGraphviz(graph) : '';
	}

	getObserverGraphviz(): string {
		const graph = this.buildObserverGraph();
		return graph ? formatAsGraphviz(graph) : '';
	}
}

// ---------------------------------------------------------------------------
// RawInfo — internal: extracts metadata from concrete observable/observer types
// ---------------------------------------------------------------------------

class RawInfo {
	static from(obs: GraphNode, debugNamePostProcessor: (name: string) => string): RawInfo | undefined {
		if (obs instanceof AutorunObserver) {
			const state = obs.debugGetState();
			return new RawInfo(obs, debugNamePostProcessor(obs.debugName), 'autorun', undefined, state.stateStr, Array.from(state.dependencies), []);
		} else if (obs instanceof ManualObserver) {
			return new RawInfo(obs, debugNamePostProcessor(obs.debugName), 'manualObserver', undefined, 'active', Array.from(obs.getDependencies()), []);
		} else if (obs instanceof Derived) {
			const state = obs.debugGetState();
			return new RawInfo(obs, debugNamePostProcessor(obs.debugName), 'derived', state.value, state.stateStr, Array.from(state.dependencies), Array.from(obs.debugGetObservers()));
		} else if (obs instanceof ObservableValue) {
			const state = obs.debugGetState();
			return new RawInfo(obs, debugNamePostProcessor(obs.debugName), 'observableValue', state.value, 'upToDate', [], Array.from(obs.debugGetObservers()));
		} else if (obs instanceof FromEventObservable) {
			const state = obs.debugGetState();
			return new RawInfo(obs, debugNamePostProcessor(obs.debugName), 'fromEvent', state.value, state.hasValue ? 'upToDate' : 'initial', [], Array.from(obs.debugGetObservers()));
		}
		return undefined;
	}

	static unknown(obs: GraphNode): RawInfo {
		return new RawInfo(obs, '(unknown)', 'unknown', undefined, 'unknown', [], []);
	}

	constructor(
		readonly sourceObj: GraphNode,
		readonly name: string,
		readonly type: string,
		readonly value: unknown,
		readonly state: string,
		readonly dependencies: GraphNode[],
		readonly observers: GraphNode[],
	) { }
}
