class CircuitGraph {
    constructor() {
        this.nodes = new Map();
        this.components = [];
        this.MERGE_RADIUS = 30;
    }

    addNode(node) {
        if (!node) return null;

        if (!node.connected) node.connected = new Set();
        
        for (const existingNode of this.nodes.values()) {
            if(node.id.substring(0, 8) === existingNode.id.substring(0, 8)) continue;
            const dx = existingNode.x - node.x;
            const dy = existingNode.y - node.y;
            const distance = Math.hypot(dx, dy);

            if (distance < this.MERGE_RADIUS) {
                // Merge connections
                if (node.connected) {
                    for (const c of node.connected) {
                        existingNode.connected.add(c);
                    }
                }

                // Make sure they reference each other
                if (existingNode !== node) {
                    existingNode.connected.add(node);
                    node.connected.add(existingNode);
                }

                // Update components to point to the canonical node
                for (const comp of this.components) {
                    if (this.sameNode(comp.start, node)) comp.start = existingNode;
                    if (this.sameNode(comp.end, node)) comp.end = existingNode;
                }

                return existingNode;
            }
        }

        console.log("Adding new node: " + node.id + ` (${node.x},${node.y})`);
        this.nodes.set(node.id, node);
        return node;
    }

    addComponent(component) {
        if (!component || !component.start || !component.end) return;

        component.start = this.addNode(component.start);
        component.end = this.addNode(component.end);

        component.start.connected.add(component.end);
        component.end.connected.add(component.start);

        this.components.push(component);
    }

    getConnections(node) {
        const connections = [];
        for (const comp of this.components) {
            if (comp.start === node) {
                connections.push({ component: comp, otherNode: comp.end });
            } else if (comp.end === node) {
                connections.push({ component: comp, otherNode: comp.start });
            }
        }
        return connections;
    }

    componentConducts(comp) {
        if (!comp) return false;
        const conductiveTypes = ['wire', 'bulb', 'resistor', 'battery'];
        if (comp.type === 'switch') return comp.is_on;
        return conductiveTypes.includes(comp.type);
    }

    hasClosedLoop(current, target, visitedComps = new Set(), visitedNodes = new Set()) {
        if (!current || !target) return false;

        if (visitedNodes.has(current)) return false;
        visitedNodes.add(current);

        console.log(`Visiting node ${current.id} (${current.x},${current.y}), target: ${target.id}`);
        console.log(`Visited components so far: ${[...visitedComps].map(c => c.id).join(',')}`);

        if (this.sameNode(current, target) && visitedComps.size > 0) {
            console.log(`Loop detected at node ${current.id}`);
            return true;
        }

        for (const { component: comp, otherNode: next } of this.getConnections(current)) {
            if (!this.componentConducts(comp) || visitedComps.has(comp)) continue;

            visitedComps.add(comp);
            if (!next) {
                console.log(`Skipping component ${comp.id}: next node is null`);
                visitedComps.delete(comp);
                continue;
            }

            if ((next.type === 'switch' && !next.is_on) || (comp.type === 'switch' && !comp.is_on)) {
                console.log(`Skipping component ${comp.id} or next node ${next.id}: switch off`);
                visitedComps.delete(comp);
                continue;
            }

            console.log(`Traversing component ${comp.id} from ${current.id} to ${next.id}`);

            if (this.hasClosedLoop(next, target, visitedComps, visitedNodes)) return true;

            visitedComps.delete(comp);
        }

        console.log(`Returning from node ${current.id} without completing loop`);
        return false;
    }

    sameNode(a, b) {
        if (!a || !b) return false;
        return a === b || (a.x === b.x && a.y === b.y);
    }

    simulate() {
        const battery = this.components.find(c => c.type === 'battery');
        if (!battery) {
            console.log("No battery found.");
            return -1;
        }

        const switches = this.components.filter(c => c.type === 'switch');
        switches.forEach(s => {
            if (!s.is_on) {
                console.log("Switch " + s.id + " is OFF");
                return -2;
            }
        });

        const start = battery.start;
        const end = battery.end;

        for (const n of this.nodes.values()) {
            console.log(`Node ${n.id}: (${n.x},${n.y}) connected to ${[...n.connected].map(c => c.id).join(',')}`);
        }
        console.log('----------------------------------------');

        const closed = this.hasClosedLoop(start, end);

        if (closed) {
            console.log("Circuit closed! Current flows.");
            const bulbs = this.components.filter(c => c.type === 'bulb');
            console.log(bulbs);
            bulbs.forEach(b => {
                if (b.is_on) console.log(`Bulb ${b.id} is now ON.`);
                else console.log(`Bulb ${b.id} is now OFF.`);
            });
            return 1;
        } else {
            console.log("Circuit open. No current flows.");
            const bulbs = this.components.filter(c => c.type === 'bulb');
            bulbs.forEach(b => {
                if (typeof b.turnOff === 'function') b.turnOff();
            });
            return 0;
        }
    }
}

export { CircuitGraph };
