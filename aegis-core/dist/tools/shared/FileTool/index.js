import createFile from './createFile.js';
import read from './read.js';
import write from './write.js';
import append from './append.js';
import deleteFile from './deleteFile.js';
export default {
    name: 'FileTool',
    version: '1.0.0',
    description: 'Perform file operations. Actions: createFile (alias: create), read, write, append, deleteFile (alias: delete).',
    actions: {
        createFile,
        read,
        write,
        append,
        deleteFile,
        create: createFile,
        delete: deleteFile,
        create_file: createFile,
        delete_file: deleteFile
    }
};
