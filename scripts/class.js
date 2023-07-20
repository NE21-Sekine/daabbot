'use strict';

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/classroom.courses.readonly'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/*
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 **/ 
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 **/
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * 
 * Load or request or authorization to call APIs.
 *
 **/
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the first 10 courses the user has access to.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listCourses(auth) {
  const classroom = google.classroom({version: 'v1', auth});
  const respon = await classroom.courses.list({
    pageSize: 10,
  });
  const courses = respon.data.courses;
  if (!courses || courses.length === 0) {
    console.log('No courses found.');
    return;
  }
  let resl = [];
  courses.forEach((course) => {
    resl.push([course.name, course.id]);
  });
  return resl;
}

/*
* fetch the first 10 assignments in the classroom
*
* @param {google.auth.OAuth2} auth An authorized OAuth2 client.
*/
async function test(auth) {
  console.log('test');
  const classroom = google.classroom({version: 'v1', auth});
  const respon = await classroom.courses.courseWork.list({
    // courseId: 616373616787,
    pageSize: 10,
  });
  console.log(respon);
  // const courses = respon.data.courses;
  // if (!courses || courses.length === 0) {
  //   console.log('No courses found.');
  //   return;
  // }
  // let resl = [];
  // courses.forEach((course) => {
  //   resl.push([course.name, course.id]);
  // });
  // return resl;
}



module.exports = (robot) => {
  robot.respond(/!cources$/i, (res) => {
    const result = authorize().then(listCourses).catch(console.error);
    result.then(function(contents) {
      for(let i = 0; i < contents.length; i++){
        res.send(`${i+1} \n コース名：　${contents[i][0]} \n コースID:　(${contents[i][1]})`);
      }
   });

   robot.respond(/!test$/i, (res) => {
    // const id = 616373616787;
    console.log('test');
    const result = authorize().then(test).catch(console.error);
    res.send(result);
  //   result.then(function(contents) {
  //     for(let i = 0; i < contents.length; i++){
  //       res.send(`${contents[i][0]} (${contents[i][1]})`);
  //     }
   })
  });

  robot.respond(/!help$/i, (res) => {
    res.send(
      '!cources => コースの名前及びIDを10個とってきます。\n !work {course Id} => そのコースIdの課題を10個とってきます。');
  });
};