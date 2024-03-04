import 'dotenv/config';
import validateEnv from './utils/validateEnv.js';
import App from './app.js';
import GroupController from './resources/group/group.controller.js';
import PersonController from './resources/person/person.controller.js';

validateEnv();
const app = new App(
    [new GroupController(), new PersonController()],
    Number(process.env.PORT)
);
app.listen();
