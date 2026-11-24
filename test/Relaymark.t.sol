// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Relaymark} from "../contracts/Relaymark.sol";

interface Vm {
    function prank(address sender) external;
    function expectRevert(bytes4 selector) external;
    function expectRevert(bytes calldata data) external;
}

contract TestAgentId {
    mapping(address => uint256) public balanceOf;
    function set(address account, uint256 balance) external { balanceOf[account] = balance; }
}

contract RelaymarkTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant author = address(11);
    address private constant reviewer = address(12);
    address private constant other = address(13);
    bytes32 private constant digest = keccak256("Public release");
    Relaymark private relay;
    TestAgentId private registry;

    function setUp() public {
        registry = new TestAgentId();
        registry.set(author, 1);
        registry.set(reviewer, 1);
        registry.set(other, 1);
        relay = new Relaymark(address(registry));
    }

    function createRequest() private returns (uint256) {
        vm.prank(author);
        return relay.request(reviewer, digest);
    }

    function testLifecycleAndWalletIndexes() public {
        uint256 id = createRequest();
        Relaymark.Record memory pending = relay.getRecord(id);
        require(pending.author == author && pending.reviewer == reviewer);
        require(pending.digest == digest && pending.status == Relaymark.Status.Pending);
        require(relay.requestCount(author) == 1 && relay.requestCount(reviewer) == 1);
        require(relay.requestCount(other) == 0);
        vm.prank(reviewer);
        relay.decide(id, true);
        require(relay.getRecord(id).status == Relaymark.Status.Approved);
        vm.prank(reviewer);
        relay.revokeApproval(id);
        require(relay.getRecord(id).status == Relaymark.Status.Revoked);
    }

    function testOnlyDesignatedReviewerCanDecide() public {
        uint256 id = createRequest();
        vm.expectRevert(Relaymark.NotReviewer.selector);
        vm.prank(other);
        relay.decide(id, true);
        vm.expectRevert(Relaymark.NotReviewer.selector);
        vm.prank(author);
        relay.decide(id, true);
    }

    function testRequiresAgentIdOnBothSidesAndAtDecision() public {
        registry.set(author, 0);
        vm.expectRevert(abi.encodeWithSelector(Relaymark.AgentIdRequired.selector, author));
        vm.prank(author);
        relay.request(reviewer, digest);
        registry.set(author, 1);

        registry.set(reviewer, 0);
        vm.expectRevert(abi.encodeWithSelector(Relaymark.AgentIdRequired.selector, reviewer));
        vm.prank(author);
        relay.request(reviewer, digest);
        registry.set(reviewer, 1);

        uint256 id = createRequest();
        registry.set(reviewer, 0);
        vm.expectRevert(abi.encodeWithSelector(Relaymark.AgentIdRequired.selector, reviewer));
        vm.prank(reviewer);
        relay.decide(id, true);
    }

    function testDeclineIsFinal() public {
        uint256 id = createRequest();
        vm.prank(reviewer);
        relay.decide(id, false);
        require(relay.getRecord(id).status == Relaymark.Status.Declined);
        vm.expectRevert(Relaymark.InvalidStatus.selector);
        vm.prank(reviewer);
        relay.decide(id, true);
    }

    function testOnlyAuthorCanWithdraw() public {
        uint256 id = createRequest();
        vm.expectRevert(Relaymark.NotAuthor.selector);
        vm.prank(other);
        relay.withdraw(id);
        vm.prank(author);
        relay.withdraw(id);
        require(relay.getRecord(id).status == Relaymark.Status.Withdrawn);
        vm.expectRevert(Relaymark.InvalidStatus.selector);
        vm.prank(reviewer);
        relay.decide(id, true);
    }

    function testAuthorCanRevokeActiveApproval() public {
        uint256 id = createRequest();
        vm.prank(reviewer);
        relay.decide(id, true);
        vm.prank(author);
        relay.withdraw(id);
        require(relay.getRecord(id).status == Relaymark.Status.Revoked);
    }

    function testRejectsSelfReview() public {
        vm.expectRevert(Relaymark.InvalidRequest.selector);
        vm.prank(author);
        relay.request(author, digest);
    }

    function testNewestFirstPaginationRemainsStableWithNewRequests() public {
        for (uint256 i = 0; i < 14; ++i) createRequest();
        (uint256[] memory page, uint256 next) = relay.requestPage(author, 14);
        require(page.length == 12 && page[0] == 14 && page[11] == 3 && next == 2);
        createRequest();
        (page, next) = relay.requestPage(author, next);
        require(page.length == 2 && page[0] == 2 && page[1] == 1 && next == 0);
    }
}
