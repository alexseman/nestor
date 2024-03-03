import {Request} from "express";

type ApiRequest = Request & {
  id?: number
};

export default ApiRequest;