import {expect,test} from 'bun:test';
import {renderToString} from 'react-dom/server';
import App,{Provider} from './App';
import {JsonRepository,MemoryStorage} from './repository';
test('la aplicación presenta el estado de carga',()=>{expect(renderToString(<Provider repository={new JsonRepository(new MemoryStorage())}><App/></Provider>)).toContain('Cargando datos locales');});
