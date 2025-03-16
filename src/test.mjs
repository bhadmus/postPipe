import { moveJsonFile } from "./helperFunctions.mjs";
import path from "path";

const sourcePath = "C:\\Users\\bhadm\\Downloads\\apitest\\API-Training-First-API-Test.postman_collection.json"
const targetDir = path.join(process.cwd(), 'endpoints', 'collection')

try{
    const movedFilePath = moveJsonFile(sourcePath, targetDir)
    console.log(`File now located at ${movedFilePath}`);
}catch(error){
    console.error('failed to move file:', error.message)
}