const OBSWebSocket = require('obs-websocket-js').default;

const sheetLoader = require('./sheet-loader');
const config = require('./config.json');








const update = async (sceneList) => {
  const data = await sheetLoader.loadData();

  const batch = []


  const range = config.range;
  const startcell = range.split(":")[0].trim();

  const startcol = startcell.match("[a-zA-Z]+");
  //console.log("starting column is " + startcol);
  const startrow = startcell.match("[0-9]+");
  //console.log("starting row is " + startrow);

  const rowoffset = startrow[0];
  //console.log("row offset to array is " + rowoffset);
  const coloffset = columnToNumber(startcol[0]);
  //console.log("colum offset to array is " + coloffset);




  await sceneList.sceneItems.forEach(async scene => {


    // console.log(scene);

    if (scene.sourceName.includes('|sheet')) {
      const reference = scene.sourceName.split('|sheet')[1].trim();

      let col = reference.match("[a-zA-Z]+");
      let colnumber = columnToNumber(col[0]) - coloffset;

      let row = reference.match("[0-9]+");
      let rownumber = row[0] - rowoffset;

      let cellvalue = data[colnumber][rownumber];
      console.log("Value for cell in source is " + cellvalue)

      if (cellvalue.length > 0) {

        batch.push({
          requestType: "SetInputSettings",
          requestData: {
            inputName: scene.sourceName,
            inputSettings: {
              text: cellvalue,

            }
          }
        }
        )

      } else {
        console.log(`Field is empty`)
        batch.push({
          requestType: "SetInputSettings",
          requestData: {
            inputName: scene.sourceName,
            inputSettings: {
              text: "Empty Field",

            }
          }
        }
        )
      }
    }
  });

  return batch
}

const getSceneList = async (obs) => {

  const { sceneName } = config

  console.log(sceneName)
  const sceneList = await obs.call('GetSceneItemList', {
    sceneName
  });

  console.log(sceneList)

  return sceneList
}

const main = async () => {
  const obs = new OBSWebSocket();

  console.log("ran")









  try {
    const {
      obsWebSocketVersion,
      negotiatedRpcVersion
    } = await obs.connect(config.obsaddress, config.obsauth, {
      rpcVersion: 1,
      eventSubscriptions: config.eventSubs,
    });
    console.log(`Connected to server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`)
  } catch (error) {
    console.error('Failed to connect', error.code, error.message);
  }

  const sceneList = await getSceneList(obs)



  const updateWrapped = async () => {
    const batch = await update(sceneList)

    console.log(batch)

    await obs.callBatch(batch)
  };

  setInterval(updateWrapped, config.polling);
  updateWrapped();
}

main().catch(e => {
  console.log("EXECUTION ERROR:");
  console.log(e);
});

function columnToNumber(str) {
  var out = 0, len = str.length;
  for (pos = 0; pos < len; pos++) {
    out += (str.charCodeAt(pos) - 64) * Math.pow(26, len - pos - 1);
  }
  return out - 1;
}