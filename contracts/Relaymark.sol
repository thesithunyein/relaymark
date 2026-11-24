// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IAgentId {
    function balanceOf(address owner) external view returns (uint256);
}

/// @notice Records review decisions for exact document bytes. Holds no assets.
/// @dev The registry is immutable. There is no owner or privileged role.
contract Relaymark {
    enum Status { Missing, Pending, Approved, Declined, Withdrawn, Revoked }

    struct Record {
        address author;
        address reviewer;
        bytes32 digest;
        uint48 createdAt;
        uint48 updatedAt;
        uint48 createdBlock;
        uint48 updatedBlock;
        Status status;
    }

    error InvalidRegistry();
    error InvalidRequest();
    error AgentIdRequired(address account);
    error NotAuthor();
    error NotReviewer();
    error InvalidStatus();

    IAgentId public immutable agentId;
    uint256 public totalRequests;
    mapping(uint256 => Record) private records;
    mapping(address => uint256[]) private accountRequests;

    event Requested(uint256 indexed id, address indexed author, address indexed reviewer, bytes32 digest);
    event Decided(uint256 indexed id, address indexed actor, Status status);

    constructor(address registry) {
        if (registry.code.length == 0) revert InvalidRegistry();
        agentId = IAgentId(registry);
    }

    function request(address reviewer, bytes32 digest) external returns (uint256 id) {
        if (reviewer == address(0) || reviewer == msg.sender || digest == bytes32(0)) revert InvalidRequest();
        requireAgentId(msg.sender);
        requireAgentId(reviewer);
        id = ++totalRequests;
        records[id] = Record(
            msg.sender, reviewer, digest, uint48(block.timestamp), uint48(block.timestamp),
            uint48(block.number), uint48(block.number), Status.Pending
        );
        accountRequests[msg.sender].push(id);
        accountRequests[reviewer].push(id);
        emit Requested(id, msg.sender, reviewer, digest);
    }

    function decide(uint256 id, bool approve) external {
        Record storage record = records[id];
        if (record.reviewer != msg.sender) revert NotReviewer();
        if (record.status != Status.Pending) revert InvalidStatus();
        requireAgentId(msg.sender);
        update(record, id, approve ? Status.Approved : Status.Declined);
    }

    function withdraw(uint256 id) external {
        Record storage record = records[id];
        if (record.author != msg.sender) revert NotAuthor();
        if (record.status == Status.Pending) {
            update(record, id, Status.Withdrawn);
        } else if (record.status == Status.Approved) {
            update(record, id, Status.Revoked);
        } else {
            revert InvalidStatus();
        }
    }

    function revokeApproval(uint256 id) external {
        Record storage record = records[id];
        if (record.reviewer != msg.sender) revert NotReviewer();
        if (record.status != Status.Approved) revert InvalidStatus();
        update(record, id, Status.Revoked);
    }

    function getRecord(uint256 id) external view returns (Record memory) {
        return records[id];
    }

    function requestCount(address account) external view returns (uint256) {
        return accountRequests[account].length;
    }

    function requestPage(address account, uint256 end) external view returns (uint256[] memory ids, uint256 next) {
        uint256[] storage all = accountRequests[account];
        if (end > all.length) end = all.length;
        uint256 size = end < 12 ? end : 12;
        ids = new uint256[](size);
        for (uint256 i = 0; i < size; ++i) ids[i] = all[end - 1 - i];
        return (ids, end - size);
    }

    function requireAgentId(address account) private view {
        if (agentId.balanceOf(account) == 0) revert AgentIdRequired(account);
    }

    function update(Record storage record, uint256 id, Status status) private {
        record.status = status;
        record.updatedAt = uint48(block.timestamp);
        record.updatedBlock = uint48(block.number);
        emit Decided(id, msg.sender, status);
    }
}
