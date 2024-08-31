"use client";
import { group } from "console";
import * as d3 from "d3";
import { INSTRUMENTATION_HOOK_FILENAME } from "next/dist/lib/constants";
import { useRef, useEffect, useState } from 'react';
const nodes = require('../node_records.json')
const relationships = require('../relationship_records.json')

export default function Page() {
  return <Component></Component>
}

function Component() {
  return (<div>
    <Graph></Graph>
  </div>)
}
type settings = {
  in_nodes: boolean,
  out_nodes: boolean,
  in_out_nodes: boolean,
  out_in_nodes: boolean,
  in_in_nodes: boolean,
  out_out_nodes: boolean,
  article_size: "Equal" | "PageRank" | "EigenVector" | "Betweenness" | "Outdegree" | "InDegree" | "Order",
  article_color: "Community" | "Same" | "Order"
}
function Graph() {
  const ref = useRef()
  const [current_node, set_current_node] = useState("Alan Turing")
  const [data, setData] = useState({} as any)
  const [settings, setSettings] = useState({ in_nodes: true, out_nodes: true, in_in_nodes: false, in_out_nodes: false, out_out_nodes: false, out_in_nodes: false, article_size: "Order", article_color: "Community" } as settings)
  const [searchText, setSearchText] = useState("Alan Turing")


  const fetch_data_with_node_title = () => {
    // need to add fetching for specific title.
    fetch(`http://localhost:4000/graph?title=${searchText}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }, mode: 'cors',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setData(data)
      })
      .catch(error => {
        console.error('There was an error!', error);
      });
  }
  useEffect(fetch_data_with_node_title, [current_node])

  function filter_data_for_graph() {
    const articles = choose_displayed_articles()
    const relationships = choose_displayed_relationships(articles);
    return { articles, relationships };
  }

  function choose_displayed_articles() {
    const filtered = [];
    for (let node of data.maximal_nodes) {
      if (node.properties.title == current_node) {
        node.fx = 640 / 2
        node.fy = 400 / 2
        node.order = 0
        filtered.push(node)
        continue;
      }
      if (settings.in_nodes) {
        if (data.in_nodes.includes(node.properties.title)) {
          node.order = 1
          filtered.push(node)
          continue;
        }
      }
      if (settings.out_nodes) {
        if (data.out_nodes.includes(node.properties.title)) {
          node.order = 1;
          filtered.push(node);
          continue;
        }
      }
      if (settings.in_in_nodes) {
        if (data.in_in_nodes.includes(node.properties.title)) {
          node.order = 2;
          filtered.push(node);
          continue;
        }
      }
      if (settings.in_out_nodes) {
        if (data.in_out_nodes.includes(node.properties.title)) {
          node.order = 2
          filtered.push(node);
          continue;
        }
      }
      if (settings.out_in_nodes) {
        if (data.out_in_nodes.includes(node.properties.title)) {
          node.order = 2;
          filtered.push(node);
          continue;
        }
      }
      if (settings.out_out_nodes) {
        if (data.out_out_nodes.includes(node.properties.title)) {
          node.order = 2;
          filtered.push(node);
          continue;
        }
      }
    }
    return filtered;
  }

  function choose_displayed_relationships(articles) {
    const articleIds = new Set(articles.map(article => article.identity.low)); // Collect all article IDs in a Set for fast lookup
    const filtered = [];

    for (let relationship of data.maximal_relationships) {
      const start = relationship.start.low;
      const end = relationship.end.low;
      if (articleIds.has(start) && articleIds.has(end)) {
        relationship.source = start;
        relationship.target = end;
        filtered.push(relationship);
      }
    }

    return filtered;
  }

  function determine_article_size(articles) {
    switch (settings.article_size) {
      case "Order":
        return (datum) => {
          return datum.order == 0 ? 10 : datum.order == 1 ? 5 : 3
        }
      case "Equal":
        return (datum) => {
          return 5
        }
      // case "PageRank":
      // case "EigenVector":
      // case "Betweenness":
      // case "Outdegree":
      //   let max = articles.reduce((article,))
      //   return (datum) => {
      //   }
      // case "InDegree":

    }
    return () => 5
  }

  function determine_article_color() {
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    switch (settings.article_color) {
      case "Order":
        return (datum) => {
          return color(datum.order);
        }
      case "Community":
        return (datum) => {
          return datum.order == 0 ? color(9) : color(datum.properties.louvain_community.low)
        }
      case "Same":
        return (datum) => {
          return datum.order == 0 ? color(9) : color(1)
        }
    }

  }

  const create_centered_graph = () => {
    const svgElement = d3.select(ref.current)
    const width = 640;
    const height = 400;

    svgElement.selectAll("*").remove();

    const { articles, relationships } = filter_data_for_graph()
    console.log(articles, relationships)
    const simulation = d3.forceSimulation(articles)
      .force("link", d3.forceLink(relationships).id(d => d.identity.low))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2)).on("tick", ticked);
    // exit exising nodes?
    svgElement.attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const link = svgElement.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll()
      .data(relationships)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svgElement.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll()
      .data(articles)
      .join("circle")
      .attr("r", determine_article_size(articles))
      .attr("fill", determine_article_color());

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
  }
  useEffect(() => {
    if (Object.keys(data).includes("maximal_nodes")) {
      create_centered_graph()
    }
  }, [data, settings])
  return (<>
    <label>
      Text input: <input name="myInput" onChange={(e) => { setSearchText(e.target.value) }} value={searchText} />
    </label>
    <hr />
    <button
      onClick={() => { set_current_node(searchText) }}>
      Search
    </button>
    <hr />
    <button onClick={() => { setSettings({ ...settings, in_nodes: !settings.in_nodes }) }} style={settings.in_nodes ? { color: "white", backgroundColor: "black" } : { color: "black", backgroundColor: "white" }} > In_Nodes</button >
    <button onClick={() => { setSettings({ ...settings, out_nodes: !settings.out_nodes }) }} style={settings.out_nodes ? { color: "white", backgroundColor: "black" } : { color: "black", backgroundColor: "white" }} > Out Nodes</button >
    {settings.in_nodes && <> <button onClick={() => { setSettings({ ...settings, in_out_nodes: !settings.in_out_nodes }) }} style={settings.in_out_nodes ? { color: "white", backgroundColor: "black" } : { color: "black", backgroundColor: "white" }} > In_out_Nodes</button >
      <button onClick={() => { setSettings({ ...settings, in_in_nodes: !settings.in_in_nodes }) }} style={settings.in_in_nodes ? { color: "white", backgroundColor: "black" } : { color: "black", backgroundColor: "white" }} > In_in_Nodes</button ></>}
    {settings.out_nodes && <><button onClick={() => { setSettings({ ...settings, out_in_nodes: !settings.out_in_nodes }) }} style={settings.out_in_nodes ? { color: "white", backgroundColor: "black" } : { color: "black", backgroundColor: "white" }} > Out_In_Nodes</button >
      <button onClick={() => { setSettings({ ...settings, out_out_nodes: !settings.out_out_nodes }) }} style={settings.out_out_nodes ? { color: "white", backgroundColor: "black" } : { color: "black", backgroundColor: "white" }} > out_out_Nodes</button ></>}
    <hr />
    <label> Choose Color</label>
    <select onChange={(e) => { setSettings({ ...settings, article_color: e.target.value as "Community" | "Order" | "Same" }) }} value={settings.article_color} >
      <option value={"Community"}>Community</option>
      <option value={"Same"}>Same</option>
      <option value={"Order"}>Order</option>
    </select>
    <h3> Color Mode: {settings.article_color}</h3>
    <hr />
    <select onChange={(e) => { setSettings({ ...settings, article_size: e.target.value as "Equal" | "PageRank" | "EigenVector" | "Betweenness" | "Outdegree" | "InDegree" | "Order" }) }} value={settings.article_size} >
      <option value={"Equal"}> Equal</option>
      <option value={"PageRank"}>PageRank</option>
      <option value={"EigenVector"}>EigenVector</option>
      <option value={"Betweenness"}>Betweenness</option>
      <option value={"Outdegree"}>Outdegree</option>
      <option value={"InDegree"}>InDegree</option>
      <option value={"Order"}>Order</option>
    </select >
    <hr />
    <svg ref={ref} width={640} height={400}></svg>
    <hr /></>)
}



