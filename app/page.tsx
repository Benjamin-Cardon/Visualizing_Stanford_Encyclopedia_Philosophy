"use client";
import { group } from "console";
import * as d3 from "d3";
import { useRef, useEffect } from 'react';
const nodes = require('../node_records.json')
const relationships = require('../relationship_records.json')

export default function Page() {
  return <Component></Component>
}

function Component() {
  return (<div>
    <h1>
      This is part 1 of the compnent
    </h1>
    <h2>
      This is part 2 of the component
    </h2>
    <Graph></Graph>
  </div>)
}
function Graph() {
  const ref = useRef()
  useEffect(() => {
    const width = 928;
    const height = 600;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const rel = relationships.map((d) => ({ source: d.relationship.start, target: d.relationship.end, value: d.relationship.properties.count }));
    const nod = nodes.map(d => ({ id: d.connected.identity, group: d.connected.labels[0] == "Entity" ? 1 : 2 }));
    console.log(nod)

    const simulation = d3.forceSimulation(nod)
      .force("link", d3.forceLink(rel).id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2)).on("tick", ticked);

    const svgElement = d3.select(ref.current)
    svgElement.attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const link = svgElement.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll()
      .data(rel)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svgElement.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll()
      .data(nod)
      .join("circle")
      .attr("r", 5)
      .attr("fill", d => color(d.group));

    node.call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

    function ticked() {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    }

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

  }, [])
  return (<svg ref={ref} width={640} height={400}></svg>)
}