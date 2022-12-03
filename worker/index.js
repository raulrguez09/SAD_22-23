import 'dotenv/config';
import express from "express";
import fs, { read } from 'fs';
import { open } from 'fs';
import cloneAndPullRepo from './repository_cloner.js';
import child_process from 'child_process';

const app = express();

app.get('/:username/:repo', (req, res) => {

    const username = req?.params?.username;
    const repo = req?.params?.repo;
    const repoPath = `${username}/${repo}`;
    const repoExists = fs.existsSync(`${repoPath}`);
    const confirmation = repoExists ? `Pulling ${repoPath}...` : `Cloning ${repoPath}...`;

    cloneAndPullRepo(repoExists, username, repo, req?.query?.branch);

    var fichero_ejecutar = ``

    const existeParams = fs.existsSync(`${repoPath}/params.txt`)

    //ejecucion sin parametros de entrada
    if(!existeParams){

      fichero_ejecutar = `${repoPath}/index.py`

      child_process.exec(`python3 ${fichero_ejecutar}`, (error, stdout, stderr) => {
      if (error) {
          console.log(`error: ${error.message}`);
          return;
      }
      if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
      }
      console.log(`Resultado: ${stdout}`);
      
      child_process.exec(`rm -rf ${username}`, (error, stdout, stderr) => {
      if (error) {
          console.log(`error: ${error.message}`);
          return;
      }
      if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
      }
      console.log(`Eliminado con exito`);
    });

    });

    }else{ //ejecucion con parametros de entrada


      
      
      fs.readFile(`${repoPath}/params.txt`, (err, data) => {
        if (err) return console.error(err);
        var params = data.toString();
        var args = params.split(' ');

        var fichero_ejecutar = `${repoPath}/index.py`

        for(let i = 0; i < args.length; i++){
          var fichero_ejecutar = `${fichero_ejecutar} ${args[i]}`
        }

        child_process.exec(`python3 ${fichero_ejecutar}`, (error, stdout, stderr) => {
          if (error) {
              console.log(`error: ${error.message}`);
              return;
          }
          if (stderr) {
              console.log(`stderr: ${stderr}`);
              return;
          }
          console.log(`Resultado: ${stdout}`);
          
    
          child_process.exec(`rm -rf ${username}`, (error, stdout, stderr) => {
            if (error) {
              console.log(`error: ${error.message}`);
              return;
          }
          if (stderr) {
              console.log(`stderr: ${stderr}`);
              return;
          }
          console.log(`Eliminado con exito`);
        });
    
        });
        
      });

    }
    

    




    res.status(200).send(confirmation);
  });


app.listen(3000, () => {
  console.log('Listen to http://localhost:3000');
});