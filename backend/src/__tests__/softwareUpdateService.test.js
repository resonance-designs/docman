import http from 'node:http';
import { EventEmitter } from 'node:events';
import { updaterRequest } from '../services/softwareUpdateService.js';

afterEach(() => jest.restoreAllMocks());

test.each(['aborted', 'error'])('rejects an interrupted helper response: %s', async event => {
    const response = new EventEmitter();
    response.setEncoding = jest.fn();
    const request = new EventEmitter();
    request.end = () => {
        response.emit('data', '{"status":');
        response.emit(event, new Error('Connection lost'));
    };
    jest.spyOn(http, 'request').mockImplementation((_options, callback) => {
        callback(response);
        return request;
    });
    await expect(updaterRequest({ action: 'status' })).rejects.toThrow();
});

test('resolves a complete helper response', async () => {
    const response = new EventEmitter();
    response.setEncoding = jest.fn();
    response.statusCode = 200;
    const request = new EventEmitter();
    request.end = () => {
        response.emit('data', '{"status":"idle"}');
        response.emit('end');
    };
    jest.spyOn(http, 'request').mockImplementation((_options, callback) => {
        callback(response);
        return request;
    });
    await expect(updaterRequest({ action: 'status' })).resolves.toEqual({ status: 'idle' });
});
