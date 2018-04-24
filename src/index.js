var Glacier = /** @class */ (function () {
    function Glacier() {
    }
    Glacier.init = function (root, initializerAction) {
        root.dispatcher = function (action) {
            return action(root.state).then(function (state) {
                root.state = state;
            });
        };
        root.dispatcher(initializerAction);
    };
    return Glacier;
}());
export { Glacier };
//# sourceMappingURL=index.js.map