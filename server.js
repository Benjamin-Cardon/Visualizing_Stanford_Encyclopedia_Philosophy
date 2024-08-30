const express = require('express')
const app = express()
const port = 4000
var neo4j = require('neo4j-driver');
const cors = require('cors');
app.use(cors());



app.get('/', (req, res) => {
  get_graph("Alan Turing").then((result) => {
    //console.log(JSON.stringify(result));
    res.json(result)
  }
  )

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

async function get_graph(title) {
  let driver;
  (async () => {
    // URI examples: 'neo4j://localhost', 'neo4j+s://xxx.databases.neo4j.io'
    const URI = "neo4j://localhost:7687"
    const USER = "neo4j"
    const PASSWORD = "foucault"
    try {
      driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))
      const serverInfo = await driver.getServerInfo()
      console.log('Connection established')
      console.log(serverInfo)
    } catch (err) {
      console.log(`Connection error\n${err}\nCause: ${err.cause}`)
    }
  })();
  const title_param = { title: title }
  const database_param = { database: 'neo4j' }
  // Get the sum total of all nodes
  let maximal_nodes = await driver.executeQuery(`Match (a:Article{title:$title})-[r:RELATED_TO*0..2]-(b:Article) return distinct b`, { title: title }, { database: 'neo4j' })
  let maximal_relationships = await driver.executeQuery(`
    MATCH path = (a:Article {title: $title})-[:RELATED_TO*0..2]-(b:Article)
    WITH collect(DISTINCT b) AS nodes
    UNWIND nodes AS n
    MATCH (n)-[r:RELATED_TO]-(m)
    WHERE m IN nodes
    RETURN distinct r `, { title: title }, { database: 'neo4j' })
  let in_nodes = await driver.executeQuery(`Match (a:Article {title:$title})-[:RELATED_TO]->(b:Article) return distinct b.title`, { title: title }, { database: 'neo4j' })
  let out_nodes = await driver.executeQuery(`Match (a:Article {title:$title})<-[:RELATED_TO]-(b:Article) return distinct b.title`, { title: title }, { database: 'neo4j' })
  let in_in_nodes = await driver.executeQuery(`Match (a:Article {title:"Alan Turing"})<-[:RELATED_TO]-(b:Article)<-[:RELATED_TO]-(c:Article) return distinct c.title`, { title: title }, { database: 'neo4j' })
  let in_out_nodes = await driver.executeQuery(`Match (a:Article {title:$title})<-[:RELATED_TO]-(b:Article)-[:RELATED_TO]->(c:Article) return distinct c.title`, { title: title }, { database: 'neo4j' })
  let out_in_nodes = await driver.executeQuery(`Match (a:Article {title:"Alan Turing"})-[:RELATED_TO]->(b:Article)<-[:RELATED_TO]-(c:Article) return distinct c.title`, { title: title }, { database: 'neo4j' })
  let out_out_nodes = await driver.executeQuery(`Match (a:Article {title:"Alan Turing"})-[:RELATED_TO]->(b:Article)-[:RELATED_TO]->(c:Article) return distinct c.title`, { title: title }, { database: `neo4j` })
  const transform = (result) => { return result.records.map(x => x.toObject().b) }
  const transform_list = (result) => { return result.records.map((record) => record.get('b.title')) }
  const transform_list2 = (result) => { return result.records.map((record) => record.get('c.title')) }
  return {
    maximal_nodes: transform(maximal_nodes),
    maximal_relationships: maximal_relationships.records.map(x => x.toObject().r),
    out_nodes: transform_list(out_nodes),
    in_nodes: transform_list(in_nodes),
    in_in_nodes: transform_list2(in_in_nodes),
    in_out_nodes: transform_list2(in_out_nodes),
    out_in_nodes: transform_list2(out_in_nodes),
    out_out_nodes: transform_list2(out_out_nodes)
  }
}
