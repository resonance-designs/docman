import fs from 'fs';
import { sha256File } from '../../lib/fileIntegrity.js';
import { inspectMigrationStorage } from '../../lib/migrationStorage.js';
jest.mock('../../lib/fileIntegrity.js',()=>({resolveStoredFile:jest.fn(name=>name),sha256File:jest.fn(async()=> 'digest')}));
const File={find:jest.fn(),updateOne:jest.fn()};

test.each([true,false])('migration (dryRun=%s) counts missing checksummed uploads and backfills only missing checksums',async dryRun=>{
 File.find.mockResolvedValue([
  {_id:'missing',documentId:'doc',filename:'missing.bin',sha256:'known'},
  {_id:'present',documentId:'doc',filename:'present.bin',sha256:'known'},
  {_id:'legacy',documentId:'doc',filename:'legacy.bin',sha256:null}
 ]);
 jest.spyOn(fs,'existsSync').mockImplementation(name=>name!=='missing.bin');
 const result=await inspectMigrationStorage(File,{dryRun});
 expect(result.missingFiles).toEqual([{fileId:'missing',documentId:'doc',filename:'missing.bin'}]);
 expect(result.checksumsRecorded).toBe(1);
 expect(sha256File).toHaveBeenCalledTimes(1);
 expect(sha256File).toHaveBeenCalledWith('legacy.bin');
 if(dryRun)expect(File.updateOne).not.toHaveBeenCalled();
 else expect(File.updateOne).toHaveBeenCalledWith({_id:'legacy'},{$set:{sha256:'digest'}});
});
