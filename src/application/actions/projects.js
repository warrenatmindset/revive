import {fetch} from '../util/fetch';

export const RESET_QUERY = 'RESET_QUERY';
export const REQUEST_REPOS = 'REQUEST_REPOS';
export const REQUEST_REPOS_ERROR = 'REQUEST_REPOS_ERROR';
export const RECEIVE_REPOS = 'RECEIVE_REPOS';

const endpoint = 'https://api.github.com';

function request(url) {
    if(process.env.MOCK_REQUEST) {
        return requestMock(url);
    }
    return fetch(url);
}

/* istanbul ignore next */
function requestMock(url) {
    return new Promise((resolve, reject) => {
        console.log('Fake request', url); //eslint-disable-line no-console
        setTimeout(() => {
            /*const page = (url.match(/\d+$/) || [])[0];
            require(['../data/repositories'], function(repos) {
                resolve(Object.assign({}, repos, {
                    items: repos.items.map((repo) => Object.assign({}, repo, {id: page + '-' + repo.id}))
                }));
            });*/
            const err = new Error('Test');
            err.response = new Response(null, {
                status: 403,
                headers: {
                    'X-RateLimit-Reset': 1459010945
                }
            });
            reject(err);
        }, 1000);
    });
}

function reposRequested(query) {
    return {type: REQUEST_REPOS, query};
}

function reposReceived(projects, total) {
    return {type: RECEIVE_REPOS, projects, total};
}

function reposRequestError(error) {
    if(error.response) {
        const {response} = error;
        return {
            type: REQUEST_REPOS_ERROR,
            limitExceeded: response.status === 403,
            badToken: response.status === 401,
            limitResetTime: (+response.headers.get('X-RateLimit-Reset'))*1000
        };
    } else {
        return {
            type: REQUEST_REPOS_ERROR,
            message: error.message
        };
    }

}

export function resetQuery(query) {
    return {type: RESET_QUERY, query};
}

export function fetchProjects() {
    return function fetchProjectsAction(dispatch, getState) {
        const {projects: {query, page}, token: {value: token}} = getState();
        const url = endpoint + `/search/repositories?q=${encodeURIComponent(query)}` +
            `&sort=stars&order=desc&page=${page+1}` +
            (token ? `&access_token=${token}` : '');
        dispatch(reposRequested(query));
        return request(url)
            .then(data =>  dispatch(reposReceived(data.items, data.total_count)))
            .catch(err => dispatch(reposRequestError(err)));
    };
}
