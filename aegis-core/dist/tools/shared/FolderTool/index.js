import create from './create.js';
import list from './list.js';
import _delete from './delete.js';
export default {
    name: 'FolderTool',
    version: '1.0.0',
    description: 'Perform folder operations. Actions: create (aliases: createFolder, mkdir), list, delete (aliases: deleteFolder, rmdir).',
    actions: {
        create,
        list,
        delete: _delete,
        createFolder: create,
        mkdir: create,
        deleteFolder: _delete,
        rmdir: _delete
    }
};
